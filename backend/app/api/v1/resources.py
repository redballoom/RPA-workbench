"""
资源代理接口
用于代理请求外部资源（如 OSS 文件），解决浏览器 CORS 问题
同时提供 HTTP 缓存支持，减少 OSS 请求流量
"""
import httpx
from fastapi import APIRouter, Query, Response
from pydantic import HttpUrl

# 缓存时间：15 天
CACHE_DURATION_SECONDS = 15 * 24 * 60 * 60

router = APIRouter(prefix="/resources", tags=["Resources"])


@router.get("/proxy")
async def proxy_resource(url: str = Query(..., description="要代理的资源 URL")):
    """
    代理请求外部资源，解决 CORS 问题

    用于前端直接请求 OSS 等外部资源时，绕过浏览器的 CORS 限制。
    后端没有 CORS 限制，可以自由请求外部资源。

    使用示例:
        GET /api/v1/resources/proxy?url=https://example.com/file.txt
    """
    try:
        # trust_env=False 禁用系统代理设置，避免 SOCKS 代理问题
        async with httpx.AsyncClient(follow_redirects=True, trust_env=False) as client:
            response = await client.get(
                url,
                timeout=30.0,  # 30秒超时
            )
            return Response(
                content=response.content,
                media_type=response.headers.get("content-type", "text/plain; charset=utf-8"),
                headers={
                    # 允许跨域访问
                    "Access-Control-Allow-Origin": "*",
                    # HTTP 缓存 15 天
                    "Cache-Control": f"public, max-age={CACHE_DURATION_SECONDS}",
                    "Content-Disposition": "inline",
                },
            )
    except httpx.RequestError as e:
        return Response(
            content=f"请求失败: {str(e)}",
            status_code=500,
            media_type="text/plain; charset=utf-8",
        )
    except Exception as e:
        return Response(
            content=f"处理请求时出错: {str(e)}",
            status_code=500,
            media_type="text/plain; charset=utf-8",
        )


@router.get("/proxy/download")
async def proxy_download(
    url: str = Query(..., description="要下载的资源 URL"),
    filename: str = Query(default="download.txt", description="下载文件名"),
):
    """
    代理下载外部资源，强制触发下载

    用于需要直接下载而不是预览的场景（如截图、日志文件下载）。
    下载请求不缓存，确保获取最新版本。
    """
    try:
        # trust_env=False 禁用系统代理设置，避免 SOCKS 代理问题
        async with httpx.AsyncClient(follow_redirects=True, trust_env=False) as client:
            response = await client.get(
                url,
                timeout=30.0,
            )
            return Response(
                content=response.content,
                media_type=response.headers.get("content-type", "application/octet-stream"),
                headers={
                    "Access-Control-Allow-Origin": "*",
                    # 下载不缓存，确保每次获取最新版本
                    "Cache-Control": "no-store, must-revalidate",
                    "Content-Disposition": f'attachment; filename="{filename}"',
                },
            )
    except httpx.RequestError as e:
        return Response(
            content=f"下载失败: {str(e)}",
            status_code=500,
            media_type="text/plain; charset=utf-8",
        )


# ==================== 内网穿透代理 ====================


@router.get("/proxy/intranet")
async def proxy_intranet(
    backend_ip: str = Query(..., description="目标主机 IP"),
    backend_port: int = Query(..., description="连接端口"),
    tak: str = Query(..., description="影刀应用名称"),
    target: str = Query(..., description="操作类型: START / ALL"),
):
    """
    内网穿透控制请求代理

    代理前端发送的内网穿透控制请求，解决浏览器 CORS 问题。
    后端没有 CORS 限制，可以自由请求外部 API。

    使用示例:
        GET /api/v1/resources/proxy/intranet?backend_ip=192.168.4.205&backend_port=8000&tak=测试应用&target=START
    """
    import time

    # 使用配置中的内网穿透地址
    intranet_base_url = settings.INTRANET_PROXY_BASE_URL

    timestamp = int(time.time())
    params = {
        "backend_ip": backend_ip,
        "backend_port": str(backend_port),
        "tak": tak,
        "target": target,
        "timestamp": str(timestamp),
    }

    try:
        # trust_env=False 禁用系统代理设置
        async with httpx.AsyncClient(follow_redirects=True, trust_env=False) as client:
            response = await client.get(
                intranet_base_url,
                params=params,
                timeout=10.0,  # 10秒超时
            )
            return {
                "success": True,
                "message": "控制请求已发送",
                "url": f"{intranet_base_url}?{httpx.URL(params=params).query.decode()}",
                "response_status": response.status_code,
            }
    except httpx.RequestError as e:
        return {
            "success": False,
            "message": f"请求失败: {str(e)}",
            "url": f"{intranet_base_url}?{httpx.URL(params=params).query.decode()}",
        }


# ==================== 任务配置管理 ====================

import oss2
import uuid
import os
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends
from typing import Optional
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.services.task_service import TaskService

settings = get_settings()


class ConfigGetRequest(BaseModel):
    """获取任务配置的请求"""
    shadow_bot_account: str = Field(..., min_length=1, description="机器人账号")
    app_name: str = Field(..., min_length=1, description="应用名称")


class ConfigGetResponse(BaseModel):
    """获取任务配置的响应"""
    config_file: bool
    config_file_url: Optional[str] = None
    config_info: bool
    config_json: Optional[str] = None


class ConfigUploadResponse(BaseModel):
    """配置文件上传响应"""
    success: bool
    file_url: Optional[str] = None
    message: str


def get_oss_bucket():
    """获取 OSS Bucket 实例"""
    if not settings.OSS_ACCESS_KEY_ID or not settings.OSS_ACCESS_KEY_SECRET:
        return None
    auth = oss2.Auth(settings.OSS_ACCESS_KEY_ID, settings.OSS_ACCESS_KEY_SECRET)
    return oss2.Bucket(auth, settings.OSS_ENDPOINT, settings.OSS_BUCKET_NAME)


@router.post("/upload/config", response_model=ConfigUploadResponse)
async def upload_config_file(
    file: UploadFile = File(...),
    shadow_bot_account: str = Form(..., description="机器人账号"),
    app_name: str = Form(..., description="应用名称"),
    db: AsyncSession = Depends(get_db),
):
    """
    上传配置文件到 OSS

    用于前端上传任务配置文件，上传后返回 OSS 文件 URL。
    文件保存路径: config/{shadow_bot_account}/{app_name}/{timestamp}_{filename}

    使用示例 (前端):
        const formData = new FormData();
        formData.append('file', fileBlob);
        formData.append('shadow_bot_account', 'redballoon');
        formData.append('app_name', '测试应用');
        fetch('/api/v1/resources/upload/config', { method: 'POST', body: formData })
    """
    # 验证 OSS 配置
    bucket = get_oss_bucket()
    if bucket is None:
        # OSS 未配置，使用本地存储
        from app.core.database import STATIC_DIR
        upload_dir = STATIC_DIR / "configs"
        upload_dir.mkdir(parents=True, exist_ok=True)

        # 生成文件名
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{timestamp}_{file.filename}"
        file_path = upload_dir / filename

        # 保存文件
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        file_url = f"/static/configs/{filename}"
        return ConfigUploadResponse(
            success=True,
            file_url=file_url,
            message="文件已保存到本地存储"
        )

    try:
        # 生成 OSS 文件名
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        ext = os.path.splitext(file.filename)[1] if file.filename else ""
        object_name = f"config/{shadow_bot_account}/{app_name}/{timestamp}{ext}"

        # 读取文件内容并上传
        content = await file.read()
        result = bucket.put_object(object_name, content)

        if result.status == 200:
            file_url = f"https://{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}/{object_name}"
            return ConfigUploadResponse(
                success=True,
                file_url=file_url,
                message="文件上传成功"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"上传失败，HTTP状态码: {result.status}"
            )

    except oss2.exceptions.OssError as e:
        raise HTTPException(
            status_code=500,
            detail=f"OSS 错误: {e.message}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"上传失败: {str(e)}"
        )


@router.post("/config/get", response_model=ConfigGetResponse)
async def get_task_config(
    payload: ConfigGetRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    获取任务配置信息（供影刀调用）

    影刀应用启动时调用此接口获取配置信息。

    请求参数:
        - shadow_bot_account: 机器人账号
        - app_name: 应用名称

    响应:
        - config_file: 是否使用配置文件
        - config_file_url: 配置文件代理 URL (通过后端代理解决跨域)
        - config_info: 是否使用配置信息
        - config_json: 配置信息 JSON (如有)
    """
    from urllib.parse import quote

    task_service = TaskService(db)

    try:
        # 通过 shadow_bot_account 和 app_name 查找任务
        task = await task_service.repo.get_by_account_and_app(
            shadow_bot_account=payload.shadow_bot_account,
            app_name=payload.app_name
        )

        if not task:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "TASK_NOT_FOUND",
                    "message": f"任务未找到: shadow_bot_account={payload.shadow_bot_account}, app_name={payload.app_name}"
                }
            )

        # 将 OSS URL 转换为代理 URL，解决跨域问题
        config_file_url = None
        if task.config_file_path:
            # 如果是 OSS URL，添加代理前缀
            if task.config_file_path.startswith('http://') or task.config_file_path.startswith('https://'):
                config_file_url = quote(task.config_file_path, safe=':/?&=')
            else:
                # 本地路径，保持原样
                config_file_url = task.config_file_path

        return ConfigGetResponse(
            config_file=task.config_file,
            config_file_url=config_file_url,
            config_info=task.config_info,
            config_json=task.config_json,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取配置失败: {str(e)}"
        )
