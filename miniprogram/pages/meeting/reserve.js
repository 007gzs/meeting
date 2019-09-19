"use strict";
// pages/meeting/reserve.js
const app = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    room_ids: "",
    loading: true,
    select:{
      selected: false,
      click: false,
      start: "",
      end: "",
      room: {}
    }
  },
  date_select_change: function (e) {
    this.setData({
      select: {selected: false, click: false, start: "", end: "", room: {}}, td_data: {}
    })
    this.refresh()
  },
  title_click: function(e){
    wx.showActionSheet({
      itemList: ['查看详情', '从列表移出'],
      success: r => {
        if (r.tapIndex == 0){
          wx.navigateTo({
            url: '../room/detail?room_id=' + e.detail.title_id + '&date=' + this.selectComponent("#date_select").data.select_date,
          })
        } else if (r.tapIndex == 1){
          let select_rooms = this.data.room_ids.split(",")
          const index = select_rooms.indexOf(e.detail.title_id)
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
  title_label_click: function () {
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
        return
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
  data_click: function (e) {
    const meeting_id = e.detail.data_id
    if(meeting_id != null){
      wx.navigateTo({
        url: '../meeting/detail?meeting_id=' + meeting_id,
      })
      return
    }
    const room_id = e.detail.title_id
    const time = e.detail.label_id
    if (!this.data.td_data || !this.data.td_data[room_id]){
      return
    }
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
      } else if (app.time.parseTime(this.data.select.start).value() > app.time.parseTime(time).value()){
        this.data.select.start = time
      }else{
        this.data.select.end = time
      }
    }
    this.data.select.end_real = app.time.valueToTime(app.time.parseTime(this.data.select.end).value() + 30 * 60).string(2)
    this.setData({ select: this.data.select })
    this.check_td_data()
  },
  check_td_data: function(){
    this.data.td_data = app.meetings.getTdData(
      this.data.rooms,
      this.data.meetings,
      this.data.time_range,
      this.data.select,
      this.selectComponent("#date_select").data.select_date
    )
    this.selectComponent("#time_table").set_data({
      titles: this.data.rooms, labels: this.data.time_range, td_data: this.data.td_data
    })
    this.setData({ select: this.data.select, loading: false })
  },
  reserve: function(){
    wx.navigateTo({
      url: 'edit?room_id=' + this.data.select.room.id + "&start_time=" + this.data.select.start + "&end_time=" + this.data.select.end_real + "&date=" + this.selectComponent("#date_select").data.select_date
    })
  },
  refresh: function () {
    if (!this.data.room_ids) {
      this.setData({ meetings: [], rooms: [], td_data: {}, loading: false })
      return
    }
    app.api.api_meeting_room_meetings({
      room_ids: this.data.room_ids,
      date: this.selectComponent("#date_select").data.select_date
    }).then(res => {

      const start_time = app.time.parseTime(res.start_time).value()
      const end_time = app.time.parseTime(res.end_time).value()
      let time_range = []
      for (let time = start_time; time <= end_time; time += 1800) {
        const t = app.time.valueToTime(time)
        const id = t.string(2)
        time_range.push({ id: id, text: t.minute == 0 ? id : "", data: t })
      }
      this.data.meetings = res.meetings
      this.data.rooms = res.rooms
      this.data.time_range = time_range
      this.selectComponent("#date_select").setDateRange(res.start_date, res.end_date)
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
    if (options.date) {
      this.selectComponent("#date_select").setData({select_date: options.date})
    }
    this.setData({ room_ids: room_ids })
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
})