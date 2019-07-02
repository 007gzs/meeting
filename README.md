# 开源会议室

## 安装方式
### 获取代码

    git clone https://github.com/007gzs/meeting.git

### 服务端配置
#### 创建数据库

    CREATE SCHEMA `meeting` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ;

#### 创建数据库
将 `server/meeting/local_settings.py.default` 重命名为 `server/meeting/local_settings.py` 并修改其中相关信息
在`server`目录中执行(推荐使用虚拟python虚拟环境)

    # 安装依赖
    pip install -r requirements.txt
    # 初始化数据库
    python manage.py makemigrations
    python manage.py migrate
    # 创建管理员用户
    python manage.py createsuperuser
    # 启动服务
    python manage.py runserver 0.0.0.0:8000

#### 后台管理地址

    http://127.0.0.1:8000/sysadmin
可以用上面创建的管理员账号登录查看


### 小程序配置
+ 将`miniprogram/utils/api.js`文件中`const server = 'http://10.100.0.7:8000'` 修改为本机内网IP
+ 将`miniprogram/project.config.json`中`appid`修改为自己的appid
+ 用微信web开发者工具打开`miniprogram`并编译
