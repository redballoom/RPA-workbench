我在向 接口“webhook/execution-complete” 上传一个日志文件后，前端点开后显示“加载日志内容失败” 且不能下载。能否显示不重要，但下载的入口必须正常，截图的处理是正常的，可以预览可以下载  请检查日志中的这个问题出现的原因，并将发现的问题和解决方法保存到 /myfiles/rob-issue6.md, 由用户决定是否修改。

测试使用的curl:
curl -X POST "http://localhost:8000/api/v1/webhook/execution-complete" \
  -H "Content-Type: application/json" \
  -d '{
    "shadow_bot_account": "tygj001",
    "app_name": "云仓收藏-v1",
    "status": "completed",
    "start_time": "2026-01-28 10:00:00",
    "end_time": "2026-01-28 10:10:00",
    "duration_seconds": 600,
    "log_info": true,
    "screenshot": false,
    "screenshot_url": "",
    "log_url": "https://rpa-workbench.oss-cn-shenzhen.aliyuncs.com/AMZ-kindel-%E8%AE%A2%E5%8D%95%E5%AF%BC%E5%87%BA_2026-0126-0956.txt"
  }'