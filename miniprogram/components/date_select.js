// components/date_select.js
const weekStr = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    start_date: String,
    end_date: String
  },

  /**
   * 组件的初始数据
   */
  data: {
    select_date: '',
    date_range: []
  },
  lifetimes: {
    // 生命周期函数，可以为函数，或一个在methods段中定义的方法名
    attached: function () {
      let start_date = new Date(this.data.start_date)
      if(isNaN(start_date)){
        start_date = new Date()
      }
      let end_date = new Date(this.data.end_date)
      if (isNaN(end_date)) {
        end_date = this.addDay(start_date, 19)
      }
      start_date = new Date(this.dateId(start_date))
      end_date = new Date(this.dateId(end_date))
      let date_range = []
      let current_date = start_date
      while (current_date <= end_date){
        date_range.push({
          id: this.dateId(current_date),
          show: this.dateShow(current_date),
          desc: this.dateDesc(current_date),
        })
        current_date = this.addDay(current_date, 1)
      }
      this.setData({ select_date: this.dateId(start_date), date_range: date_range})
    },
  },
  /**
   * 组件的方法列表
   */
  methods: {
    change: function(){
      this.triggerEvent('change', { select_date: this.data.select_date }, { })
    },
    tap: function(e){
      this.setData({select_date: e.currentTarget.id})
      this.change()
    },
    addDay: function(date, day){
      return new Date(Date.parse(date) + 86400000 * day)
    },
    formatNumber: function(n) {
      n = n.toString()
      return n[1] ? n : '0' + n
    },
    dateId: function(date){
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      return [year, month, day].map(this.formatNumber).join('-')
    },
    dateShow: function (date) {
      const month = date.getMonth() + 1
      const day = date.getDate()
      return [month, day].map(this.formatNumber).join('/')
    },
    dateDesc: function (date) {
      const now = new Date()
      if(this.dateId(now) == this.dateId(date)){
        return "今天"
      }
      return weekStr[date.getDay()]
    }
  }
})
