import RubricsTree from './rubrics-tree.js';

new Vue({
  data: () => ({
    title: 'Дополнительное тестовое задание на позицию «Frontend-разработчик» от klerk.ru',
  }),
  components: {
    RubricsTree,
  },
}).$mount('#app');
