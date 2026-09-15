#!/usr/bin/env python3
"""生成问卷扫码用二维码。

用法：
    python3 generate_qr.py <问卷URL> [输出文件名]

示例：
    python3 generate_qr.py http://192.168.1.3:3000/          # 同一 Wi-Fi 局域网扫码
    python3 generate_qr.py https://your-domain.com/quiz/     # 部署到公网/内网服务器后
"""
import sys
import qrcode

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    url = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else '问卷二维码.png'
    img = qrcode.make(url, box_size=12, border=2)
    img.save(out)
    print(f'二维码已生成：{out}  →  {url}')

if __name__ == '__main__':
    main()
