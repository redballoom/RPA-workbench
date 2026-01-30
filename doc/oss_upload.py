#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
影刀本地文件上传到阿里云 OSS 工具

使用方法:
    python oss_upload.py /path/to/file.txt
    python oss_upload.py /path/to/file.txt --folder logs
    python oss_upload.py /path/to/file.txt --folder screenshots --rename myfile.png
"""

import os
import sys
import argparse
import uuid
from datetime import datetime
from pathlib import Path

try:
    import oss2
except ImportError:
    print("请安装 oss2 库: pip install oss2")
    sys.exit(1)


# ==================== OSS 配置 ====================
# 从环境变量读取，或直接修改这里
OSS_ACCESS_KEY_ID = os.getenv("OSS_ACCESS_KEY_ID", "")
OSS_ACCESS_KEY_SECRET = os.getenv("OSS_ACCESS_KEY_SECRET", "")
OSS_BUCKET_NAME = "rpa-workbench"
OSS_ENDPOINT = "oss-cn-shenzhen.aliyuncs.com"


class OSSUploader:
    """OSS 上传工具类"""

    def __init__(
        self,
        access_key_id: str = OSS_ACCESS_KEY_ID,
        access_key_secret: str = OSS_ACCESS_KEY_SECRET,
        bucket_name: str = OSS_BUCKET_NAME,
        endpoint: str = OSS_ENDPOINT,
    ):
        """
        初始化 OSS 上传器

        Args:
            access_key_id: 阿里云 AccessKey ID
            access_key_secret: 阿里云 AccessKey Secret
            bucket_name: OSS Bucket 名称
            endpoint: OSS 节点地址
        """
        if not access_key_id or not access_key_secret:
            raise ValueError("请配置 OSS_ACCESS_KEY_ID 和 OSS_ACCESS_KEY_SECRET")

        self.auth = oss2.Auth(access_key_id, access_key_secret)
        self.bucket = oss2.Bucket(self.auth, endpoint, bucket_name)
        self.bucket_name = bucket_name
        self.endpoint = endpoint

    def upload(
        self,
        local_path: str,
        folder: str = "uploads",
        rename: str = None,
    ) -> str:
        """
        上传本地文件到 OSS

        Args:
            local_path: 本地文件路径
            folder: OSS 文件夹名称
            rename: 自定义文件名（可选）

        Returns:
            OSS 文件访问 URL
        """
        local_path = Path(local_path)

        if not local_path.exists():
            raise FileNotFoundError(f"文件不存在: {local_path}")

        if not local_path.is_file():
            raise ValueError(f"不是文件: {local_path}")

        # 生成文件名
        if rename:
            filename = rename
        else:
            # 保持原文件名，或添加时间戳避免重复
            filename = local_path.name
            # 如果文件已存在，添加 UUID 避免覆盖
            if self._exists(f"{folder}/{filename}"):
                suffix = local_path.suffix
                filename = f"{local_path.stem}_{uuid.uuid4().hex[:8]}{suffix}"

        oss_key = f"{folder}/{filename}"

        # 上传文件
        print(f"正在上传: {local_path} -> oss://{oss_key}")
        self.bucket.put_object_from_file(oss_key, str(local_path))

        # 返回访问 URL
        url = f"https://{self.bucket_name}.{self.endpoint}/{oss_key}"
        print(f"上传成功: {url}")

        return url

    def upload_with_content(
        self,
        content: bytes,
        filename: str,
        folder: str = "uploads",
    ) -> str:
        """
        上传字节内容到 OSS

        Args:
            content: 文件内容（字节）
            filename: 文件名
            folder: OSS 文件夹名称

        Returns:
            OSS 文件访问 URL
        """
        oss_key = f"{folder}/{filename}"

        print(f"正在上传内容 -> oss://{oss_key}")
        self.bucket.put_object(oss_key, content)

        url = f"https://{self.bucket_name}.{self.endpoint}/{oss_key}"
        print(f"上传成功: {url}")

        return url

    def _exists(self, oss_key: str) -> bool:
        """检查 OSS 文件是否存在"""
        try:
            self.bucket.get_object_meta(oss_key)
            return True
        except oss2.exceptions.NoSuchKey:
            return False

    def get_url(self, oss_key: str) -> str:
        """生成 OSS 文件访问 URL"""
        return f"https://{self.bucket_name}.{self.endpoint}/{oss_key}"


def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(
        description="上传本地文件到阿里云 OSS",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    # 上传文件（自动生成文件名）
    python oss_upload.py /tmp/screenshot.png

    # 上传到指定文件夹
    python oss_upload.py /tmp/log.txt --folder logs

    # 自定义文件名
    python oss_upload.py /tmp/data.json --rename backup.json

环境变量:
    OSS_ACCESS_KEY_ID     - 阿里云 AccessKey ID
    OSS_ACCESS_KEY_SECRET - 阿里云 AccessKey Secret
    OSS_BUCKET_NAME       - OSS Bucket 名称
    OSS_ENDPOINT          - OSS 节点地址
        """,
    )

    parser.add_argument("local_path", help="本地文件路径")
    parser.add_argument(
        "--folder", "-f",
        default="uploads",
        help="OSS 文件夹名称 (默认: uploads)"
    )
    parser.add_argument(
        "--rename", "-r",
        default=None,
        help="自定义文件名 (默认: 保持原文件名)"
    )
    parser.add_argument(
        "--key-id",
        default=OSS_ACCESS_KEY_ID,
        help="OSS AccessKey ID"
    )
    parser.add_argument(
        "--key-secret",
        default=OSS_ACCESS_KEY_SECRET,
        help="OSS AccessKey Secret"
    )
    parser.add_argument(
        "--bucket",
        default=OSS_BUCKET_NAME,
        help="OSS Bucket 名称"
    )
    parser.add_argument(
        "--endpoint",
        default=OSS_ENDPOINT,
        help="OSS 节点地址"
    )

    args = parser.parse_args()

    try:
        uploader = OSSUploader(
            access_key_id=args.key_id,
            access_key_secret=args.key_secret,
            bucket_name=args.bucket,
            endpoint=args.endpoint,
        )

        url = uploader.upload(
            local_path=args.local_path,
            folder=args.folder,
            rename=args.rename,
        )

        print(f"\nOSS URL: {url}")
        return 0

    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
