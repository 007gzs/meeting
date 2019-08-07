"use strict";

const setCookieTool = require('./set-cookie.js');

/**
 * 设置cookie 参数为字符串，
 * 例如cookieA=a; expires=Tue, 14-Aug-2018 10:00:45 GMT; path=/; HttpOnly,cookieB=b; expires=Wed, 15-Aug-2018 08:00:45 GMT; path=/
 */
const setCookie = (str) => {
  // 处理参数
  var splitCookieHeaders = setCookieTool.splitCookiesString(str);
  var cookies = setCookieTool.parse(splitCookieHeaders);

  // 获取本地的cookie
  var localCookie = queryCookie();

  // 循环处理 数组
  cookies.forEach((c) => {
    localCookie[c.name] = c;
  });

  // 过滤
  localCookie = checkExpires(localCookie);

  // 持久化cookies
  saveCookie(localCookie);

}

/**
 * 设置cookie 参数为wx.request的返回头
 */
const setCookieByHead = (head) => {
  if (head && head['Set-Cookie']) {
    setCookie(head['Set-Cookie']);
  }
}

/**
 * 获取cookie
 * 如果 传递了参数key，返回key对应的值
 * 如果 没有传递参数，返回所有cookie的kv对象
 */
const getCookie = (key) => {
  // 获取本地的cookie
  var localCookie = queryCookie();
  // 过滤
  localCookie = checkExpires(localCookie);
  // 持久化cookies
  saveCookie(localCookie);

  // 返回
  if (key) {
    return localCookie[key];
  } else {
    return localCookie;
  }
}

/**
 * 获取请求用的cookie字符串
 */
const getCookieForReq = () => {
  // 获取本地的cookie
  var localCookie = queryCookie();
  // 过滤
  localCookie = checkExpires(localCookie);
  // 持久化cookies
  saveCookie(localCookie);
  // 返回
  var rs = '';
  for (var i in localCookie) {
    var c = localCookie[i];
    rs += (c.name + "=" + c.value + "; ");
  }

  // 处理末端
  if (rs.substr(rs.length - 2, 2) == '; ') {
    rs = rs.substr(0, rs.length - 2);
  }

  return rs;
}

/**
 * 检查cookie是否过期（内部）
 * 返回过滤后的cookies
 */
const checkExpires = (cookies) => {
  if (!cookies) {
    cookies = queryCookie();
  }
  var app = getApp();
  var now = app === undefined ? new Date() : app.nowDate();
  var newCookies = {};

  for (var i in cookies) {
    var exp = new Date(cookies[i].expires);
    if (exp > now) {
      newCookies[i] = (cookies[i]);
    }
  }

  return newCookies;
}

/**
 * cookie持久化,会用cookies覆盖所有数据
 */
const saveCookie = (cookies) => {
  wx.setStorageSync('cti_cookie', cookies);
}

/**
 * 从持久化数据中返回cookie
 */
const queryCookie = () => {
  return wx.getStorageSync('cti_cookie');
}

module.exports = {
  getCookieForReq: getCookieForReq,
  setCookieByHead: setCookieByHead
}
