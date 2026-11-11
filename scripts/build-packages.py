import os
import json
import zipfile

os.makedirs('public/downloads', exist_ok=True)

EXCLUDED_FILES = {
    'IMG_20261107_200235_2a2e66f4.jpg',
    'IMG_20261107_230917_24d3d47c.jpg',
    'Screenshot_20261106_155017_aae4ff75.jpg',
    'Screenshot_20261108_082953_989faa4c.jpg',
    'pwabuilder-sw_86e65577.js',
    'manifest_4f7ec02e.json',
}

def patch_for_web_and_apk(content_bytes, filename):
    try:
        text = content_bytes.decode('utf-8')
        if filename.endswith('.html'):
            # Keep /manifest.json and /pwabuilder-sw.js root-relative for PWABuilder + Netlify
            text = text.replace('src="/assets/', 'src="./assets/')
            text = text.replace('href="/assets/', 'href="./assets/')
        elif filename.endswith('.js') and not filename.endswith('sw.js'):
            text = text.replace('"/assets/aistudio/1793986109511_c82dfa3d.png"', '"./assets/aistudio/1793986109511_c82dfa3d.png"')
            text = text.replace("'/assets/aistudio/1793986109511_c82dfa3d.png'", "'./assets/aistudio/1793986109511_c82dfa3d.png'")
        return text.encode('utf-8')
    except Exception:
        return content_bytes

# 1. Create cube-crush-web-game.zip (100% PWABuilder + Netlify + APK ready)
web_zip_path = 'public/downloads/cube-crush-web-game.zip'
with zipfile.ZipFile(web_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    if os.path.exists('dist'):
        for root, dirs, files in os.walk('dist'):
            if 'downloads' in root.split(os.sep):
                continue
            for file in files:
                if file in EXCLUDED_FILES:
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, 'dist')
                if file == '1793986109511_c82dfa3d.png' and os.path.exists('public/pwa-512x512.png'):
                    zf.write('public/pwa-512x512.png', rel_path)
                elif file.endswith(('.html', '.js')):
                    with open(full_path, 'rb') as f:
                        patched = patch_for_web_and_apk(f.read(), file)
                    zf.writestr(rel_path, patched)
                else:
                    zf.write(full_path, rel_path)

# 2. Create cube-crush-android-apk-kit.zip
apk_zip_path = 'public/downloads/cube-crush-android-apk-kit.zip'
twa_manifest = {
    "packageId": "com.cubecrush.blockpuzzle",
    "host": "dazzling-choux-1e0e99.netlify.app",
    "name": "Cube Crush",
    "launcherName": "Cube Crush",
    "display": "standalone",
    "themeColor": "#122259",
    "navigationColor": "#122259",
    "backgroundColor": "#122259",
    "enableNotifications": False,
    "startUrl": "/",
    "iconUrl": "https://dazzling-choux-1e0e99.netlify.app/pwa-512x512.png",
    "maskableIconUrl": "https://dazzling-choux-1e0e99.netlify.app/pwa-maskable-512x512.png",
    "appVersionName": "1.0.0",
    "appVersionCode": 1,
    "shortcuts": [],
    "generatorApp": "pwabuilder",
    "orientation": "portrait"
}

capacitor_config = {
    "appId": "com.cubecrush.blockpuzzle",
    "appName": "Cube Crush",
    "webDir": "www",
    "bundledWebRuntime": False
}

with zipfile.ZipFile(apk_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.writestr('twa-manifest.json', json.dumps(twa_manifest, indent=2))
    zf.writestr('capacitor.config.json', json.dumps(capacitor_config, indent=2))
    if os.path.exists('dist'):
        for root, dirs, files in os.walk('dist'):
            if 'downloads' in root.split(os.sep):
                continue
            for file in files:
                if file in EXCLUDED_FILES:
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.join('www', os.path.relpath(full_path, 'dist'))
                if file == '1793986109511_c82dfa3d.png' and os.path.exists('public/pwa-512x512.png'):
                    zf.write('public/pwa-512x512.png', rel_path)
                elif file.endswith(('.html', '.js')):
                    with open(full_path, 'rb') as f:
                        patched = patch_for_web_and_apk(f.read(), file)
                    zf.writestr(rel_path, patched)
                else:
                    zf.write(full_path, rel_path)

print("Generated PWABuilder + Netlify compliant ZIP packages successfully!")
