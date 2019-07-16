// components/date_select.js
const weekStr = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const app = getApp()
Component({
  /**
   * 组件的属性列表
   */
  properties: {
  },

  /**
   * 组件的初始数据
   */
  data: {
    start_date: '',
    end_date: '',
    select_date: '',
    date_range: []
  },
  lifetimes: {
    // 生命周期函数，可以为函数，或一个在methods段中定义的方法名
    attached: function () {
      
    },
  },
  /**
   * 组件的方法列表
   */
  methods: {
    setDateRange: function(start_date, end_date){
      let select_date_ok = false
      start_date = new Date(start_date)
      if (isNaN(start_date)) {
        start_date = app.nowDate()
      }
      end_date = new Date(end_date)
      if (isNaN(end_date)) {
        end_date = this.addDay(start_date, 19)
      }
      start_date = new Date(this.dateId(start_date))
      end_date = new Date(this.dateId(end_date))
      let date_range = []
      let current_date = start_date
      while (current_date <= end_date) {
        select_date_ok = select_date_ok || this.data.select_date == this.dateId(current_date)
        date_range.push({
          id: this.dateId(current_date),
          show: this.dateShow(current_date),
          desc: this.dateDesc(current_date),
        })
        current_date = this.addDay(current_date, 1)
      }
      let set_data = { date_range: date_range, start_date: this.dateId(start_date), end_date: this.dateId(end_date)}
      if (!select_date_ok) {
        set_data.select_date = this.dateId(start_date)
      }
      this.setData(set_data)
    },
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
      const now = app.nowDate()
      if(this.dateId(now) == this.dateId(date)){
        return "今天"
      }
      return weekStr[date.getDay()]
    }
  }
})
