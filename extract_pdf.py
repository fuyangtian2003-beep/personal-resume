import sys
import subprocess
import os

# 1. 自动安装并导入 PyMuPDF
try:
    import fitz
except ImportError:
    print("PyMuPDF (fitz) not found. Installing now...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pymupdf"])
        import fitz
        print("PyMuPDF installed successfully!")
    except Exception as e:
        print(f"Error installing PyMuPDF via pip: {e}")
        sys.exit(1)

# 2. 路径配置
pdf_path = r"D:\BOB\Desktop\DeskFile\my\简历（伏杨天）\演示（伏杨天）_2-3.pdf"
output_dir = r"d:\JavaProjects\personalresume\src\main\resources\static\img"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

try:
    doc = fitz.open(pdf_path)
    print(f"Successfully opened PDF: {pdf_path}")
    print(f"Total pages: {len(doc)}")
    
    # 渲染每一页为高清 PNG
    for i in range(len(doc)):
        page = doc[i]
        # 使用 2.0 倍矩阵缩放以确保高清渲染
        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        
        # 第一页对应“校园二手市场——腊肉”，第二页对应“电商小程序——美柿”
        if i == 0:
            filename = "larou_demo.png"
        elif i == 1:
            filename = "meishi_demo.png"
        else:
            filename = f"project_page_{i+2}.png"
            
        out_path = os.path.join(output_dir, filename)
        pix.save(out_path)
        print(f"Page {i+1} saved as {out_path}")
        
    print("All images extracted and saved to static/img/ successfully!")
    
except Exception as e:
    print(f"An error occurred during PDF processing: {e}")
    sys.exit(1)
