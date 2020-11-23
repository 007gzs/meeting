"use strict";
const request = require('./request');
const server = 'http://127.0.0.1:8000';

const ERROR_CODE = {
  SUCCESS: 0, // 返回成功
  ERROR_UNKNOWN: -1, // 未知错误
  ERROR_SYSTEM: -2, // 系统错误
  ERROR_BAD_PARAMETER: -11, // 参数错误
  ERROR_BAD_FORMAT: -12, // 格式错误
  ERROR_PERMISSION: -13, // 权限错误
  ERR_WECHAT_LOGIN: 10001, // 需要登录
  ERR_MEETING_ROOM_TIMEOVER: 20001, // 时间已过
  ERR_MEETING_ROOM_INUSE: 20002, // 时间冲突
  ERR_MEETING_ROOM_NOT_FOUND: 20003, // 会议室未找到
  ERR_MEETING_NOT_FOUND: 20004 // 会议室未找到
}


// 小程序登录
const api_wechat_login = function({
  js_code // 小程序登录code
} = {}) {
  return request({
    server: server,
    path: '/api/wechat/login',
    method: 'GET',
    data: {
      js_code: js_code
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 小程序用户信息
const api_wechat_user_info = function({
  encrypted_data, // 完整用户信息的加密数据
  iv // 加密算法的初始向量
} = {}) {
  return request({
    server: server,
    path: '/api/wechat/user/info',
    method: 'POST',
    data: {
      encrypted_data: encrypted_data,
      iv: iv
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 配置信息
const api_meeting_config = function() {
  return request({
    server: server,
    path: '/api/meeting/config',
    method: 'GET',
    data: {},
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 创建会议室
const api_meeting_room_create = function({
  name, // 名称
  description, // 描述
  create_user_manager // 创建人管理权限
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/room/create',
    method: 'POST',
    data: {
      name: name,
      description: description,
      create_user_manager: create_user_manager
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 修改会议室
const api_meeting_room_edit = function({
  room_id, // 会议室ID
  name, // 名称
  description, // 描述
  create_user_manager // 创建人管理权限
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/room/edit',
    method: 'POST',
    data: {
      room_id: room_id,
      name: name,
      description: description,
      create_user_manager: create_user_manager
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 删除会议室
const api_meeting_room_delete = function({
  room_id // 会议室ID
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/room/delete',
    method: 'GET',
    data: {
      room_id: room_id
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 会议室信息
const api_meeting_room_info = function({
  room_id // 会议室ID
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/room/info',
    method: 'GET',
    data: {
      room_id: room_id
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 关注会议室
const api_meeting_room_follow = function({
  room_id // 会议室ID列表
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/room/follow',
    method: 'GET',
    data: {
      room_id: room_id
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 取消关注会议室
const api_meeting_room_un_follow = function({
  room_id // 会议室ID
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/room/un/follow',
    method: 'GET',
    data: {
      room_id: room_id
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 已关注会议室列表
const api_meeting_follow_rooms = function() {
  return request({
    server: server,
    path: '/api/meeting/follow/rooms',
    method: 'GET',
    data: {},
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 创建会议室列表
const api_meeting_create_rooms = function() {
  return request({
    server: server,
    path: '/api/meeting/create/rooms',
    method: 'GET',
    data: {},
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 会议室预约列表
const api_meeting_room_meetings = function({
  room_ids, // 会议室ID列表
  date // 日期
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/room/meetings',
    method: 'GET',
    data: {
      room_ids: room_ids,
      date: date
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 会议室预约历史
const api_meeting_history_meetings = function({
  room_id, // 会议室ID
  start_date, // 开始日期
  end_date // 结束日期
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/history/meetings',
    method: 'GET',
    data: {
      room_id: room_id,
      start_date: start_date,
      end_date: end_date
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 我参与的会议列表
const api_meeting_my_meetings = function({
  date // 日期
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/my/meetings',
    method: 'GET',
    data: {
      date: date
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 预约会议
const api_meeting_reserve = function({
  room_id, // 会议室ID
  name, // 名称
  description, // 描述
  date, // 预定日期
  start_time, // 开始时间
  end_time // 结束时间
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/reserve',
    method: 'POST',
    data: {
      room_id: room_id,
      name: name,
      description: description,
      date: date,
      start_time: start_time,
      end_time: end_time
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 会议详情
const api_meeting_info = function({
  meeting_id // 会议ID
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/info',
    method: 'GET',
    data: {
      meeting_id: meeting_id
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 会议修改
const api_meeting_edit = function({
  meeting_id, // 会议ID
  name, // 名称
  description // 描述
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/edit',
    method: 'POST',
    data: {
      meeting_id: meeting_id,
      name: name,
      description: description
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 取消会议
const api_meeting_cancel = function({
  meeting_id // 会议ID
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/cancel',
    method: 'GET',
    data: {
      meeting_id: meeting_id
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 参加会议
const api_meeting_join = function({
  meeting_id // 会议ID
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/join',
    method: 'GET',
    data: {
      meeting_id: meeting_id
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


// 取消参加会议
const api_meeting_leave = function({
  meeting_id // 会议ID
} = {}) {
  return request({
    server: server,
    path: '/api/meeting/leave',
    method: 'GET',
    data: {
      meeting_id: meeting_id
    },
    header: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
}


module.exports = {
  ERROR_CODE: ERROR_CODE,
  api_wechat_login: api_wechat_login,
  api_wechat_user_info: api_wechat_user_info,
  api_meeting_config: api_meeting_config,
  api_meeting_room_create: api_meeting_room_create,
  api_meeting_room_edit: api_meeting_room_edit,
  api_meeting_room_delete: api_meeting_room_delete,
  api_meeting_room_info: api_meeting_room_info,
  api_meeting_room_follow: api_meeting_room_follow,
  api_meeting_room_un_follow: api_meeting_room_un_follow,
  api_meeting_follow_rooms: api_meeting_follow_rooms,
  api_meeting_create_rooms: api_meeting_create_rooms,
  api_meeting_room_meetings: api_meeting_room_meetings,
  api_meeting_history_meetings: api_meeting_history_meetings,
  api_meeting_my_meetings: api_meeting_my_meetings,
  api_meeting_reserve: api_meeting_reserve,
  api_meeting_info: api_meeting_info,
  api_meeting_edit: api_meeting_edit,
  api_meeting_cancel: api_meeting_cancel,
  api_meeting_join: api_meeting_join,
  api_meeting_leave: api_meeting_leave
}