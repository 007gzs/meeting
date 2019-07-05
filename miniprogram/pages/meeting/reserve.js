"use strict";
// pages/meeting/reserve.js
const app = getApp()
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}
const Time = function (hour=0, minute=0, second=0){
  this.hour = hour
  this.minute = minute
  this.second = second
  this.string = function (num = 2) {
    let ret = []
    if (num > 0) {
      ret.push(this.hour)
    }
    if (num > 1) {
      ret.push(this.minute)
    }
    if (num > 2) {
      ret.push(this.second)
    }
    return ret.map(formatNumber).join(":")
  }
  this.value = function () {
    return this.hour * 3600 + this.minute * 60 + this.second
  }
}
const valueToTime = function (value) {
  const hour = Math.floor(value / 3600);
  value %= 3600
  const minute = Math.floor(value / 60);
  value %= 60
  return new Time(hour, minute, value)
}
const parseTime = function(str){
  const t = str.split(":")
  return new Time(
    t.length > 0 ? parseInt(t[0]) : 0,
    t.length > 1 ? parseInt(t[1]) : 0,
    t.length > 2 ? parseInt(t[2]) : 0
  )
}
Page({

  /**
   * 页面的初始数据
   */
  data: {
    room_ids: "",
    start_time: new Time(7, 0),
    end_time: new Time(22, 30),
    setp_minute: 30,
    time_range: [],
    select:{
      selected: false,
      click: false,
      start: "",
      end: "",
      room: {}
    },
    rooms: [],
    meetings: [],
    td_data: {}
  },
  date_select_change: function (e) {
    this.setData({
      select: {selected: false, click: false, start: "", end: "", room: {}}, td_data: {}
    })
    this.refresh()
  },
  room_detail: function(e){
    wx.showActionSheet({
      itemList: ['查看详情', '从列表移出'],
      success: r => {
        if (r.tapIndex == 0){
          wx.navigateTo({
            url: '../room/detail?room_id=' + e.currentTarget.id,
          })
        } else if (r.tapIndex == 1){
          let select_rooms = this.data.room_ids.split(",")
          const index = select_rooms.indexOf(e.currentTarget.id)
          if (index >= 0) {
            select_rooms.splice(index, 1)
            const room_ids_str = select_rooms.join(",")
            wx.setStorageSync('RESERVE_ROOM_IDS', room_ids_str)
            this.setData({ room_ids: room_ids_str })
            this.refresh()
          }
        }
      }
    })
  },
  add_room: function () {
    const select_rooms = this.data.room_ids.split(",")
    if(select_rooms.length >= 5){
      wx.showToast({
        title: '超过上限',
        icon: 'none'
      })
      return
    }
    app.api.api_meeting_follow_rooms().then(res => {
      let room_ids = []
      let room_names = []
      for(let i in res){
        let room = res[i]
        if (select_rooms.indexOf(room.id.toString()) < 0){
          room_ids.push(room.id.toString())
          room_names.push(room.name)
        }
      }
      if(room_ids.length == 0){
        wx.showToast({
          title: '已没有关注的会议室',
          icon: 'none'
        })
      }
      wx.showActionSheet({
        itemList: room_names,
        success: r => {
          room_ids.push(room_ids[r.tapIndex])
          let room_ids_str = select_rooms
          if (room_ids_str != ''){
            room_ids_str += ","
          }
          room_ids_str += room_ids[r.tapIndex]
          wx.setStorageSync('RESERVE_ROOM_IDS', room_ids_str)
          this.setData({ room_ids: room_ids_str })
          this.refresh()
        }
      })
    })
  },
  time_select: function(e){
    const room_id = e.currentTarget.dataset.room
    const time = e.currentTarget.dataset.time
    const td_data = this.data.td_data[room_id][time]
    if (td_data.expire || td_data.meeting_status != 0){
      return 
    }
    if (td_data.selected_status != 0){
      // if (this.data.select.click) {
        this.data.select.click = false
        this.data.select.selected = false
        this.setData({ select: this.data.select })
        this.check_td_data()
      // }
      return
    }
    if (!this.data.select.selected || this.data.select.room.id != room_id) {
      this.data.select.click = false
      this.data.select.selected = false
    }
    this.data.select.room = this.data.rooms.find(r => {return r.id == room_id})
    if (!this.data.select.click) {
      this.data.select.selected = true
      this.data.select.click = true
      this.data.select.start = time
      this.data.select.end = time
    } else {
      this.data.select.click = false
      if (this.data.select.start == time){
        this.data.select.selected = false
      }else if (parseTime(this.data.select.start).value() > parseTime(time).value()){
        this.data.select.start = time
      }else{
        this.data.select.end = time
      }
    }
    this.data.select.end_real = valueToTime(parseTime(this.data.select.end).value() + 30 * 60).string(2)
    this.setData({ select: this.data.select })
    this.check_td_data()
  },
  check_status: function(start_time, end_time, now_time){
    /**
     * 0: 不在范围内
     * 0x1: 第一
     * 0x2: 最后 
     * 0x4: 中间
     */
    let ret = 0
    if (start_time > now_time || now_time > end_time){
      return ret
    }
    ret |= 0x4
    if (start_time == now_time) {
      ret |= 0x1
    }
    if (end_time == now_time) {
      ret |= 0x2
    }
    return ret
  },
  get_str_list: function(str, count){
    const num = Math.floor(str.length / count) /* 每格放文字数 */
    const left = str.length - num * count /* 剩余文字数 */
    const float_pro_count = left / count /* 剩余文字每格需要放几个（小数） */
    let c = 0
    let left_c = 0
    let ret = []
    for(let i = 1; i < count; i++){
      let now_c = num
      if (float_pro_count * i - left_c >= 0.5){
        now_c ++
        left_c ++
      }
      ret.push(str.substring(c, c + now_c))
      c += now_c
    }
    ret.push(str.substring(c, str.length))
    return ret
  },
  get_meeting_data: function(room_id, time){
    const time_value = time.value()
    const filter_meetings = this.data.meetings.filter(m => { return m.room.toString() == room_id.toString() })
    for (let i in filter_meetings){
      let meeting = filter_meetings[i]
      const start_time = parseTime(meeting.start_time).value()
      const end_time = parseTime(meeting.end_time).value()
      let status = this.check_status(start_time, end_time - 30 * 60, time_value)
      if(status != 0){
        let count = Math.round((end_time - start_time) / 30 / 60)
        let str_list = this.get_str_list(meeting.name, count)
        let pos = Math.round((time_value - start_time) / 30 / 60)
        return { status: status, text: str_list[pos]}
        
      }
    }
    return { status: 0, text: '' }
  },
  check_td_data: function(){
    let td_data = {}
    for(let i in this.data.rooms){
      let room = this.data.rooms[i]
      td_data[room.id] = {}
      for (let j in this.data.time_range){
        let time = this.data.time_range[j]
        
        let selected_status = 0
        if (this.data.select.selected && this.data.select.room.id == room.id){
          selected_status = this.check_status(
            parseTime(this.data.select.start).value(), parseTime(this.data.select.end).value(), time.data.value()
          )
        }
        let meeting_data = this.get_meeting_data(room.id, time.data)
        let select_date = new Date(this.selectComponent("#date_select").data.select_date)
        let now = new Date()
        let today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).valueOf()
        select_date = new Date(select_date.getFullYear(), select_date.getMonth(), select_date.getDate()).valueOf()
        let now_time = new Time(now.getHours(), now.getMinutes(), now.getSeconds()).value()
        let expire = false
        if (select_date < today){
          expire = true
        } else if (select_date == today){
          if (now_time > time.data.value()){
            expire = true
          }
        }
        let clazz = []
        if(expire){
          clazz.push("expire")
        }
        const border_style = function(_clazz, _status){
          if (_status & 0x1) {
            _clazz.push("top")
          }
          if (_status & 0x2) {
            _clazz.push("bottom")
          }
        }
        if (meeting_data.status == 0 && selected_status == 0) {
          border_style(clazz, 0x1 | 0x2 | 0x4)
        }
        if (meeting_data.status != 0) {
          clazz.push("in_use")
          border_style(clazz, meeting_data.status)
          if(selected_status != 0){
            this.setData({
              select: { selected: false, click: false, start: "", end: "", room: {} }, td_data: {}
            })
            this.check_td_data()
            return
          }
        }
        if (selected_status != 0) {
          clazz.push("selected")
          border_style(clazz, selected_status)
        }

        td_data[room.id][time.id] = {
          clazz: clazz.join(" "),
          expire: expire,
          meeting_status: meeting_data.status,
          text: meeting_data.text,
          selected_status: selected_status
        }
      }
    }
    
    this.setData({ td_data: td_data })
  },
  reserve: function(){
    wx.navigateTo({
      url: 'edit?room_id=' + this.data.select.room.id + "&start_time=" + this.data.select.start + "&end_time=" + this.data.select.end_real + "&date=" + this.selectComponent("#date_select").data.select_date
    })
  },
  refresh: function () {
    if (!this.data.room_ids) {
      this.setData({ meetings: [], rooms: [], td_data: {} })
      return
    }
    app.api.api_meeting_room_meetings({
      room_ids: this.data.room_ids,
      date: this.selectComponent("#date_select").data.select_date
    }).then(res => {
      this.setData({meetings: res.meetings, rooms: res.rooms})
      this.check_td_data()
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let room_ids = options.room_ids
    if(!room_ids){
      try {
        room_ids = wx.getStorageSync('RESERVE_ROOM_IDS')
      } catch (e) {
        room_ids = ""
      }
    }
    if(!room_ids){
      room_ids = ""
    }
    const start_time = this.data.start_time.value()
    const end_time = this.data.end_time.value()
    let time_range = []
    for(let time = start_time; time <= end_time; time += 1800){
      const t = valueToTime(time)
      const id = t.string(2)
      time_range.push({ id: id, text: t.minute == 0 ? id: "", data: t})
    }
    this.setData({ room_ids: room_ids, time_range: time_range })
    this.refresh()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.refresh()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})