// components/time_table.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    no_title_desc: String,
    title_label: String
  },

  /**
   * 组件的初始数据
   */
  data: {
    titles: [],
    labels: [],
    td_data: {},
  },
  /**
   * 组件的方法列表
   */
  methods: {
    set_data: function({titles, labels, td_data} = {}){
      let data = {}
      if (titles !== undefined) {
        data['titles'] = titles
      }
      if (labels !== undefined) {
        data['labels'] = labels
      }
      if (td_data !== undefined) {
        data['td_data'] = td_data
      }
      
      this.setData(data)
    },
    event: function(event, data = {}){
      this.triggerEvent(event, data, {})
    },
    title_label_click: function(e){
      this.event('title_label_click')
    },
    title_click: function (e) {
      this.event('title_click', {
        title_id: e.currentTarget.id
      })
    },
    label_click: function (e) {
      this.event('label_click', {
        label_id: e.currentTarget.id
      })
    },
    data_click: function(e){
      this.event('data_click', {
        title_id: e.currentTarget.dataset.title,
        label_id: e.currentTarget.dataset.label,
        data_id: e.currentTarget.dataset.data,
      })
    }
  }
})
