import http.server
import socketserver
import webbrowser
import os
import re

PORT = 8000
GAME_JS_PATH = os.path.join("static", "js", "game.js")

class GameHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 允许跨域（本地开发方便）
        self.send_response(200)
        super().do_GET()

def start_server():
    print(f"❤️ 正在启动爱心服务器...")
    print(f"👉 请在浏览器访问: http://localhost:{PORT}")
    
    # 自动打开浏览器
    webbrowser.open(f"http://localhost:{PORT}")
    
    with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 服务器已关闭")

def modify_game_settings():
    print("\n--- 🛠️ 游戏参数调整工具 ---")
    if not os.path.exists(GAME_JS_PATH):
        print(f"❌ 错误：找不到文件 {GAME_JS_PATH}")
        return

    with open(GAME_JS_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # 读取当前参数
    points_match = re.search(r'let points = (\d+);', content)
    current_points = points_match.group(1) if points_match else "未知"

    print(f"当前初始爱心值: {current_points}")
    
    new_points = input("请输入新的初始爱心值 (回车跳过): ")
    
    if new_points.isdigit():
        content = re.sub(r'let points = \d+;', f'let points = {new_points};', content)
        print(f"✅ 已修改初始爱心值为: {new_points}")
    
    # 保存文件
    with open(GAME_JS_PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print("💾 设置已保存！请刷新网页生效。")

def main():
    while True:
        print("\n==========================")
        print("   Python 游戏管理器 v1.0")
        print("==========================")
        print("1. 🚀 启动本地服务器 (预览游戏)")
        print("2. ⚙️  调整游戏难度 (修改初始爱心)")
        print("3. ❌ 退出")
        
        choice = input("\n请选择功能 (1-3): ")
        
        if choice == '1':
            start_server()
        elif choice == '2':
            modify_game_settings()
        elif choice == '3':
            break
        else:
            print("无效输入，请重试")

if __name__ == "__main__":
    main()
