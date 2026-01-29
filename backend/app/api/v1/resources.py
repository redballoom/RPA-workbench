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

INTRANET_PROXY_BASE_URL = "https://qn-v.xf5920.cn/yingdao"


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
                INTRANET_PROXY_BASE_URL,
                params=params,
                timeout=10.0,  # 10秒超时
            )
            return {
                "success": True,
                "message": "控制请求已发送",
                "url": f"{INTRANET_PROXY_BASE_URL}?{httpx.URL(params=params).query.decode()}",
                "response_status": response.status_code,
            }
    except httpx.RequestError as e:
        return {
            "success": False,
            "message": f"请求失败: {str(e)}",
            "url": f"{INTRANET_PROXY_BASE_URL}?{httpx.URL(params=params).query.decode()}",
        }
