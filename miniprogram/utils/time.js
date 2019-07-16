"use strict";
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}
const Time = function (hour = 0, minute = 0, second = 0) {
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
  return this
}
const valueToTime = function (value) {
  const hour = Math.floor(value / 3600);
  value %= 3600
  const minute = Math.floor(value / 60);
  value %= 60
  return new Time(hour, minute, value)
}
const parseTime = function (str) {
  const t = str.split(":")
  return new Time(
    t.length > 0 ? parseInt(t[0]) : 0,
    t.length > 1 ? parseInt(t[1]) : 0,
    t.length > 2 ? parseInt(t[2]) : 0
  )
}

module.exports = {
  formatNumber: formatNumber,
  Time: Time,
  valueToTime: valueToTime,
  parseTime: parseTime
}