"use strict";
const check_status = (start_time, end_time, now_time) => {
  /**
   * 0: 不在范围内
   * 0x1: 第一
   * 0x2: 最后 
   * 0x4: 中间
   */
  let ret = 0
  if (start_time > now_time || now_time > end_time) {
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
}
const get_str_list = (str_arr, count) => {
  const num = Math.floor(str_arr.length / count) /* 每格放文字数 */
  const left = str_arr.length - num * count /* 剩余文字数 */
  const float_pro_count = left / count /* 剩余文字每格需要放几个（小数） */
  let c = 0
  let left_c = 0
  let ret = []
  for (let i = 1; i < count; i++) {
    let now_c = num
    if (float_pro_count * i - left_c >= 0.5) {
      now_c++
      left_c++
    }
    ret.push(str_arr.slice(c, c + now_c).join(""))
    c += now_c
  }
  ret.push(str_arr.slice(c, str_arr.length).join(""))
  return ret
}
const get_meeting_data = (room_id, time, meetings) => {
  const time_value = time.value()
  const filter_meetings = meetings.filter(m => { return m.room.toString() == room_id.toString() })
  for (let i in filter_meetings) {
    let meeting = filter_meetings[i]
    const start_time = getApp().time.parseTime(meeting.start_time).value()
    const end_time = getApp().time.parseTime(meeting.end_time).value()
    let status = check_status(start_time, end_time - 30 * 60, time_value)
    if (status != 0) {
      let count = Math.round((end_time - start_time) / 30 / 60)
      let str_list = get_str_list(meeting.name.split(""), count)
      //let str_list = meeting.name_list
      let pos = Math.round((time_value - start_time) / 30 / 60)
      return { status: status, text: str_list[pos], id: meeting.id }

    }
  }
  return { status: 0, text: '', id: null }
}
const getTdData = (rooms, meetings, time_range, select, select_date) => {
  let td_data = {}
  let now = getApp().nowDate()
  let now_time = getApp().time.Time(now.getHours(), now.getMinutes(), now.getSeconds()).value()
  for (let i in rooms) {
    let room = rooms[i]
    td_data[room.id] = {}
    for (let j in time_range) {
      let time = time_range[j]

      let selected_status = 0
      if (select.selected && select.room.id == room.id) {
        selected_status = check_status(
          getApp().time.parseTime(select.start).value(),
          getApp().time.parseTime(select.end).value(),
          time.data.value()
        )
      }
      let meeting_data = get_meeting_data(room.id, time.data, meetings)
      let local_select_date = new Date(select_date)
      let today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).valueOf()
      local_select_date = new Date(local_select_date.getFullYear(), local_select_date.getMonth(), local_select_date.getDate()).valueOf()
      let expire = false
      if (local_select_date < today) {
        expire = true
      } else if (local_select_date == today) {
        if (now_time > time.data.value()) {
          expire = true
        }
      }
      let clazz = []
      if (expire) {
        clazz.push("expire")
      }
      const border_style = function (_clazz, _status) {
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
        if (selected_status != 0) {
          select.selected = false
          select.click = false
          select.start = ""
          select.end = ""
          select.room = {}
          return getTdData(rooms, meetings, time_range, select, select_date)
        }
      }
      if (selected_status != 0) {
        clazz.push("selected")
        border_style(clazz, selected_status)
      }

      td_data[room.id][time.id] = {
        clazz: clazz.join(" "),
        expire: expire,
        meeting_id: meeting_data.id,
        meeting_status: meeting_data.status,
        text: meeting_data.text,
        selected_status: selected_status
      }
    }
  }
  return td_data
}
module.exports = {
  getTdData: getTdData
}