const RubricItem = {
  name: 'RubricItem',
  template: `
  <li class="klerk-rubrics-tree__item">
    <button
      class="klerk-rubrics-tree__btn"
      :class="{'klerk-rubrics-tree__btn--up': isOpen}"
      v-if="isParent" @click="isOpen = !isOpen">
    </button>
    <input
      v-if="isCheck"
      type="checkbox"
      :value="childCount"
      @change="checked($event)"
    >
    <a
      class="klerk-rubrics-tree__link"
      :href="baseUrl + rubric.url" target="_blank">
      {{ rubric.title }} ({{  rubric.count }} , {{ childCount }})
    </a>
    <template v-if="rubric.children">
    <ul class="klerk-rubrics-tree__list" v-show="isOpen">
      <rubric-item
        :isCheck="false"
        v-for="rubric of rubric.children"
        :key="rubric.id"
        :rubric="rubric"
        :baseUrl="baseUrl"
        @checked="$emit('checked', $event)"
      ></rubric-item>
    </ul>
    </template>
  </li>
  `,
  props: {
    rubric: Object,
    baseUrl: String,
    isCheck: {
      type: Boolean,
      default: true,
    },
  },
  data: () => ({
    isOpen: false,
  }),
  computed: {
    isParent: (vm) => vm.rubric.children && vm.rubric.children.length,
    childCount: (vm) =>
      vm.rubric.children
        ? vm.rubric.children.reduce((sum, rubric) => sum + rubric.count, 0) + vm.rubric.count
        : vm.rubric.count,
  },
  methods: {
    checked: function (event) {
      this.$emit('checked', event.target);
    },
  },
};

export default {
  name: 'RubricsTree',
  components: {
    RubricItem,
  },
  template: `
  <div class="klerk-rubrics-tree">
    <h2>Рубрикатор</h2>
    <template v-if="loader">
      <div class="loader">
        <div class="l_main">
          <div class="l_square"><span></span><span></span><span></span></div>
          <div class="l_square"><span></span><span></span><span></span></div>
          <div class="l_square"><span></span><span></span><span></span></div>
          <div class="l_square"><span></span><span></span><span></span></div>
        </div>
      </div>
    </template>
    <template v-else>
      <div v-if="error" class="klerk-rubrics-tree__error">
        <p> {{ error }} </p>
      </div>
      <template v-else>
        <p class="klerk-rubrics-tree__count-sum" > Сумма count-ов отмеченных элементов: {{ checkedRubrics }} </p>
        <div class="klerk-rubrics-tree__empty">
          <label
            class="klerk-rubrics-tree__label"
            for="empty"
          > Отображать пустые рубрики? </label>
          <input
            class="klerk-rubrics-tree__input"
            id="empty"
            type="checkbox"
            v-model="allowEmpty"
          >
        </div>
        <ul class="klerk-rubrics-tree__list">
          <rubric-item
            v-for="rubric of getRubricsFor"
            :key="rubric.id" :rubric="rubric"
            :baseUrl="baseUrl"
            @checked="checked"
          ></rubric-item>
        </ul>
      </template>
    </template>
  </div>
  `,
  data: () => ({
    loader: false,
    rubrics: null,
    rubricsAll: null,
    checkedRubrics: 0,
    expiresTime: 60000,
    baseUrl: 'https://www.klerk.ru',
    proxyUrl: 'https://polar-island-78083.herokuapp.com/',
    timeUrl: 'https://worldtimeapi.org/api/timezone/etc/UTC',
    url: 'https://www.klerk.ru/yindex.php/v3/event/rubrics',
    urlAll: 'https://www.klerk.ru/yindex.php/v3/event/rubrics/?allowEmpty=1',
    error: null,
    allowEmpty: false,
  }),
  computed: {
    getRubricsFor: function () {
      return this.allowEmpty ? this.rubricsAll : this.rubrics;
    },
  },
  created: function () {
    this.initialization();
  },
  methods: {
    initialization: function () {
      this.loader = true;
      const serverTime = this.getTime();
      serverTime
        .then((time) => {
          this.error = '';
          this.isExpireTime(time) ? this.setRubricsOffline() : this.setRubricsOnline(time);
        })
        .catch((error) => {
          this.loader = false;
          this.error = error;
          setTimeout(this.initialization, 2000);
        });
    },
    isExpireTime: function (time) {
      return localStorage.getItem('expiresAt') && time < localStorage.getItem('expiresAt');
    },
    setRubricsOffline: function () {
      this.rubrics = JSON.parse(localStorage.getItem('rubrics'));
      this.rubricsAll = JSON.parse(localStorage.getItem('rubricsAll'));
      this.loader = false;
    },
    setRubricsOnline: function (time) {
      this.clearStorage();
      Promise.all([this.getRubrics(this.url), this.getRubrics(this.urlAll)])
        .then((response) => {
          this.error = '';
          const [rubrics, rubricsAll] = [...response];
          this.rubrics = rubrics;
          this.rubricsAll = rubricsAll;
          localStorage.setItem('rubrics', JSON.stringify(rubrics));
          localStorage.setItem('rubricsAll', JSON.stringify(rubricsAll));
          localStorage.setItem('expiresAt', time + this.expiresTime);
          this.loader = false;
        })
        .catch((error) => {
          this.loader = false;
          this.error = error;
          setTimeout(this.initialization, 2000);
        });
    },
    clearStorage: function () {
      localStorage.removeItem('expiresAt');
      localStorage.removeItem('rubrics');
      localStorage.removeItem('rubricsAll');
    },
    getTime: async function () {
      const response = await fetch(this.timeUrl);
      if (response.ok) {
        const data = await response.json();
        return new Date(data.utc_datetime).getTime();
      } else {
        this.errorHandler(response.status);
      }
    },
    getRubrics: async function (url) {
      const response = await fetch(this.proxyUrl + url);
      if (response.ok) {
        const data = await response.json();
        return data;
      } else {
        this.errorHandler(response.status);
      }
    },
    errorHandler: function (status) {
      switch (status) {
        case 400:
          throw new Error('400 плохой запрос');
        case 401:
          throw new Error('401 ошибка авторизации');
        case 403:
          throw new Error('403 Запрещено.');
        case 404:
          throw new Error('404 Сервер не найден');
        default:
          throw new Error(response.statusText);
      }
    },
    checked: function (value) {
      value.checked ? (this.checkedRubrics += +value.value) : (this.checkedRubrics -= +value.value);
    },
  },
};
