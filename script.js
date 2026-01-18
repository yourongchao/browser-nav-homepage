/* 浏览器导航主页 - 主JavaScript文件
 * 
 * 功能概述：
 * 1. 数据管理：使用localStorage保存用户设置，包括导航项、壁纸、布局配置
 * 2. 导航网格：动态渲染可自定义的网站导航图标网格
 * 3. 右键菜单：支持导航图标和壁纸区域的右键操作
 * 4. 设置面板：提供壁纸设置、导航管理、布局调整、数据导入导出功能
 * 5. 响应式设计：适配不同屏幕尺寸，支持暗色模式
 * 
 * 技术特性：
 * - 纯前端实现，无外部依赖
 * - 使用ES6+类模块化组织代码
 * - 基于localStorage的持久化存储
 * - 事件驱动的交互设计
 * 
 * 文件结构：
 * 1. NavigationModel类：数据模型和localStorage操作
 * 2. NavigationApp类：主应用逻辑和UI交互
 * 3. DOMContentLoaded事件：应用初始化
 */

// 存储适配器基类
class StorageAdapter {
    constructor(model) {
        this.model = model;
    }
    
    // 抽象方法，子类必须实现
    async openStorage() {}
    async saveStorage() {}
    async backupStorage() {}
    async restoreStorage() {}
}

// FileSystemAccess API适配器（Chrome/Edge/Opera）
class FileSystemAccessAdapter extends StorageAdapter {
    async openStorage() {
        try {
            const opened = await this.model.openStorageFile();
            return opened;
        } catch (err) {
            console.error('FileSystemAccessAdapter: 打开存储失败', err);
            return false;
        }
    }
    
    async saveStorage() {
        try {
            const saved = await this.model.saveToFile();
            return saved;
        } catch (err) {
            console.error('FileSystemAccessAdapter: 保存存储失败', err);
            return false;
        }
    }
    
    async backupStorage() {
        try {
            const backedUp = await this.model.backupFile();
            return backedUp;
        } catch (err) {
            console.error('FileSystemAccessAdapter: 备份存储失败', err);
            return false;
        }
    }
    
    async restoreStorage() {
        try {
            const restored = await this.model.restoreFromBackup();
            return restored;
        } catch (err) {
            console.error('FileSystemAccessAdapter: 恢复存储失败', err);
            return false;
        }
    }
}

// Firefox存储适配器
class FirefoxStorageAdapter extends StorageAdapter {
    constructor(model) {
        super(model);
        this.fileInput = null;
        this.downloadLink = null;
        this.isInitialized = false;
    }
    
    // 初始化DOM元素
    initElements() {
        if (this.isInitialized) {
            return;
        }
        
        try {
            // 创建文件输入元素
            if (!this.fileInput) {
                this.fileInput = document.createElement('input');
                this.fileInput.type = 'file';
                this.fileInput.accept = '.json';
                this.fileInput.style.display = 'none';
                // 添加唯一标识，便于调试
                this.fileInput.id = 'firefox-storage-file-input';
                document.body.appendChild(this.fileInput);
            }
            
            // 创建下载链接元素
            if (!this.downloadLink) {
                this.downloadLink = document.createElement('a');
                this.downloadLink.style.display = 'none';
                // 添加唯一标识，便于调试
                this.downloadLink.id = 'firefox-storage-download-link';
                document.body.appendChild(this.downloadLink);
            }
            
            this.isInitialized = true;
        } catch (err) {
            console.error('Firefox存储适配器初始化DOM元素失败:', err);
            this.isInitialized = false;
        }
    }
    
    // 清理DOM元素
    cleanupElements() {
        try {
            if (this.fileInput && document.body.contains(this.fileInput)) {
                document.body.removeChild(this.fileInput);
                this.fileInput = null;
            }
            
            if (this.downloadLink && document.body.contains(this.downloadLink)) {
                document.body.removeChild(this.downloadLink);
                this.downloadLink = null;
            }
            
            this.isInitialized = false;
        } catch (err) {
            console.error('清理DOM元素失败:', err);
        }
    }
    
    // 打开存储文件
    async openStorage() {
        try {
            this.initElements();
            
            if (!this.isInitialized) {
                console.error('Firefox存储适配器未正确初始化');
                // 回退到localStorage
                this.model.currentSettings = this.model.loadSettings();
                return true;
            }
            
            return new Promise((resolve) => {
                // 确保之前的事件监听器已移除
                this.fileInput.onchange = null;
                
                this.fileInput.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        
                        reader.onload = (event) => {
                            try {
                                const data = JSON.parse(event.target.result);
                                
                                // 验证数据有效性
                                if (this.model.validateSettings(data)) {
                                    this.model.currentSettings = data;
                                    this.model.ensureSettingsStructure();
                                    this.model.saveSettings(); // 同时保存到localStorage作为备份
                                    console.log('成功从文件加载设置');
                                    resolve(true);
                                } else {
                                    console.error('文件中的数据无效');
                                    resolve(false);
                                }
                            } catch (err) {
                                console.error('读取文件失败:', err);
                                resolve(false);
                            }
                        };
                        
                        reader.onerror = (event) => {
                            console.error('文件读取错误:', event.target.error);
                            resolve(false);
                        };
                        
                        reader.readAsText(file);
                    } else {
                        // 用户取消了文件选择
                        resolve(false);
                    }
                };
                
                this.fileInput.click();
            });
        } catch (err) {
            console.error('打开存储文件失败:', err);
            // 回退到localStorage
            this.model.currentSettings = this.model.loadSettings();
            return true;
        }
    }
    
    // 保存存储文件
    async saveStorage() {
        try {
            this.initElements();
            
            if (!this.isInitialized) {
                console.error('Firefox存储适配器未正确初始化');
                // 回退到localStorage
                return this.model.saveSettings();
            }
            
            // 更新时间戳和校验和
            this.model.currentSettings.timestamp = Date.now();
            this.model.currentSettings.checksum = this.model.generateChecksum(this.model.currentSettings);
            
            const dataStr = JSON.stringify(this.model.currentSettings, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            // 使用<a download>方式下载文件
            const url = URL.createObjectURL(dataBlob);
            this.downloadLink.href = url;
            this.downloadLink.download = this.model.storageFileName;
            
            // 触发下载
            this.downloadLink.click();
            
            // 清理URL对象
            setTimeout(() => {
                URL.revokeObjectURL(url);
                console.log('成功保存设置文件');
            }, 100);
            
            // 同时保存到localStorage作为备份
            this.model.saveSettings();
            
            return true;
        } catch (err) {
            console.error('保存文件失败:', err);
            // 回退到localStorage
            return this.model.saveSettings();
        }
    }
    
    // 备份存储文件
    async backupStorage() {
        try {
            this.initElements();
            
            if (!this.isInitialized) {
                console.error('Firefox存储适配器未正确初始化');
                // 回退到localStorage备份
                return this.model.saveSettings();
            }
            
            // 更新时间戳和校验和
            this.model.currentSettings.timestamp = Date.now();
            this.model.currentSettings.checksum = this.model.generateChecksum(this.model.currentSettings);
            
            // 生成带有时间戳的备份文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `${this.model.backupFileName.replace('.json', '')}-${timestamp}.json`;
            
            const dataStr = JSON.stringify(this.model.currentSettings, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            // 使用<a download>方式下载备份文件
            const url = URL.createObjectURL(dataBlob);
            this.downloadLink.href = url;
            this.downloadLink.download = backupFileName;
            this.downloadLink.click();
            
            // 清理URL对象
            setTimeout(() => {
                URL.revokeObjectURL(url);
                console.log('成功创建备份文件:', backupFileName);
            }, 100);
            
            return true;
        } catch (err) {
            console.error('备份文件失败:', err);
            // 回退到localStorage备份
            return this.model.saveSettings();
        }
    }
    
    // 恢复存储文件
    async restoreStorage() {
        try {
            return await this.openStorage();
        } catch (err) {
            console.error('恢复存储文件失败:', err);
            // 回退到localStorage
            this.model.currentSettings = this.model.loadSettings();
            return true;
        }
    }
    
    // 销毁适配器
    destroy() {
        this.cleanupElements();
    }
}

// IndexedDB适配器（跨浏览器兼容方案）
class IndexedDBAdapter extends StorageAdapter {
    constructor(model) {
        super(model);
        this.dbName = 'navigationSettingsDB';
        this.storeName = 'settings';
        this.dbVersion = 1;
        this.db = null;
    }
    
    // 初始化IndexedDB连接
    async initDB() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }
            
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // 创建存储对象
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onerror = (event) => {
                console.error('IndexedDB初始化失败:', event.target.error);
                reject(event.target.error);
            };
        });
    }
    
    // 执行IndexedDB事务
    async executeTransaction(mode, callback) {
        const db = await this.initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], mode);
            const store = transaction.objectStore(this.storeName);
            
            try {
                const result = callback(store);
                
                transaction.oncomplete = () => {
                    resolve(result);
                };
                
                transaction.onerror = (event) => {
                    console.error('IndexedDB事务失败:', event.target.error);
                    reject(event.target.error);
                };
            } catch (err) {
                console.error('IndexedDB操作失败:', err);
                reject(err);
            }
        });
    }
    
    async openStorage() {
        try {
            // 从IndexedDB读取设置
            const settings = await this.executeTransaction('readonly', (store) => {
                return store.get(1);
            });
            
            if (settings) {
                if (this.model.validateSettings(settings)) {
                    this.model.currentSettings = settings;
                    this.model.ensureSettingsStructure();
                    // 同时保存到localStorage作为备份
                    this.model.saveSettings();
                    return true;
                } else {
                    console.error('IndexedDB中的数据无效，使用默认设置');
                    this.model.currentSettings = this.model.defaultSettings;
                    this.model.ensureSettingsStructure();
                    return true;
                }
            } else {
                // 如果IndexedDB中没有数据，从localStorage加载
                this.model.currentSettings = this.model.loadSettings();
                // 保存到IndexedDB
                await this.saveStorage();
                return true;
            }
        } catch (err) {
            console.error('从IndexedDB打开存储失败:', err);
            // 失败时回退到localStorage
            this.model.currentSettings = this.model.loadSettings();
            return true;
        }
    }
    
    async saveStorage() {
        try {
            // 更新时间戳和校验和
            this.model.currentSettings.timestamp = Date.now();
            this.model.currentSettings.checksum = this.model.generateChecksum(this.model.currentSettings);
            
            // 保存到IndexedDB
            await this.executeTransaction('readwrite', (store) => {
                return store.put({ id: 1, ...this.model.currentSettings });
            });
            
            // 同时保存到localStorage作为备份
            this.model.saveSettings();
            return true;
        } catch (err) {
            console.error('保存到IndexedDB失败:', err);
            // 失败时确保数据至少保存到localStorage
            return this.model.saveSettings();
        }
    }
    
    async backupStorage() {
        try {
            // 从IndexedDB获取最新数据
            const settings = await this.executeTransaction('readonly', (store) => {
                return store.get(1);
            });
            
            const dataStr = JSON.stringify(settings || this.model.currentSettings, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            // 创建临时下载链接
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = this.model.backupFileName;
            downloadLink.click();
            
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 100);
            
            return true;
        } catch (err) {
            console.error('从IndexedDB备份失败:', err);
            // 失败时回退到localStorage备份
            return this.model.saveSettings();
        }
    }
    
    async restoreStorage() {
        return new Promise((resolve) => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (event) => {
                        try {
                            const data = JSON.parse(event.target.result);
                            if (this.model.validateSettings(data)) {
                                // 更新时间戳和校验和
                                data.timestamp = Date.now();
                                data.checksum = this.model.generateChecksum(data);
                                
                                // 保存到IndexedDB
                                await this.executeTransaction('readwrite', (store) => {
                                    return store.put({ id: 1, ...data });
                                });
                                
                                // 更新内存中的设置
                                this.model.currentSettings = data;
                                this.model.ensureSettingsStructure();
                                // 同时保存到localStorage
                                this.model.saveSettings();
                                
                                resolve(true);
                            } else {
                                console.error('导入的数据无效');
                                resolve(false);
                            }
                        } catch (err) {
                            console.error('恢复存储失败:', err);
                            resolve(false);
                        } finally {
                            // 清理DOM元素
                            document.body.removeChild(fileInput);
                        }
                    };
                    reader.readAsText(file);
                } else {
                    document.body.removeChild(fileInput);
                    resolve(false);
                }
            };
            
            fileInput.click();
        });
    }
}

// LocalStorage适配器（作为最终后备方案）
class LocalStorageAdapter extends StorageAdapter {
    async openStorage() {
        // 对于LocalStorage，直接使用loadSettings
        this.model.currentSettings = this.model.loadSettings();
        return true;
    }
    
    async saveStorage() {
        // 对于LocalStorage，直接使用saveSettings
        return this.model.saveSettings();
    }
    
    async backupStorage() {
        // 对于LocalStorage，直接使用exportSettings
        const dataStr = JSON.stringify(this.model.currentSettings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        // 创建临时下载链接
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = this.model.backupFileName;
        downloadLink.click();
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
        
        return true;
    }
    
    async restoreStorage() {
        // 对于LocalStorage，需要用户选择文件
        return new Promise((resolve) => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.json';
            fileInput.style.display = 'none';
            document.body.appendChild(fileInput);
            
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            const data = JSON.parse(event.target.result);
                            if (this.model.validateSettings(data)) {
                                this.model.currentSettings = data;
                                this.model.ensureSettingsStructure();
                                this.model.saveSettings();
                                resolve(true);
                            } else {
                                resolve(false);
                            }
                        } catch (err) {
                            console.error('恢复存储失败:', err);
                            resolve(false);
                        }
                        
                        // 清理DOM元素
                        document.body.removeChild(fileInput);
                    };
                    reader.readAsText(file);
                } else {
                    document.body.removeChild(fileInput);
                    resolve(false);
                }
            };
            
            fileInput.click();
        });
    }
}

// 数据模型类：负责所有数据的存储、加载和操作
class NavigationModel {
    constructor() {
        // 本地存储相关属性
        this.storageKey = 'browser-nav-settings';
        
        // 文件系统相关属性
        this.fileHandle = null;
        this.isFileStorageEnabled = false;
        this.storageFileName = 'navigation-settings.json';
        this.backupFileName = 'navigation-settings.backup.json';
        this.checksumKey = 'nav-settings-checksum';
        
        // 默认设置
        this.defaultSettings = {
            version: '1.0',
            timestamp: Date.now(),
            checksum: '',
            wallpaper: '',
            navigationItems: [
                { id: 1, name: 'Google', url: 'https://google.com', icon: '🔍' },
                { id: 2, name: 'GitHub', url: 'https://github.com', icon: '💻' },
                { id: 3, name: 'YouTube', url: 'https://youtube.com', icon: '▶️' },
                { id: 4, name: 'Gmail', url: 'https://mail.google.com', icon: '📧' },
                { id: 5, name: '百度', url: 'https://baidu.com', icon: '🌐' },
                { id: 6, name: '知乎', url: 'https://zhihu.com', icon: '📚' },
                { id: 7, name: 'CSDN', url: 'https://csdn.net', icon: '👨‍💻' },
                { id: 8, name: 'B站', url: 'https://bilibili.com', icon: '🎬' },
                { id: 9, name: '淘宝', url: 'https://taobao.com', icon: '🛒' },
                { id: 10, name: '微信', url: 'https://wx.qq.com', icon: '💬' }
            ],
            toolGroups: [],
            layout: {
                columns: 8,
                spacing: 10,
                iconSize: 48
            },
            search: {
                engine: 'google',
                opacity: 0.2 // 对应80%透明度，因为1 - 0.2 = 0.8
            },
            textColor: '#2d3748' // 默认文字颜色
        };
        
        // 初始化数据
        this.currentSettings = this.loadSettings();
        
        // 确保必要属性存在
        this.ensureSettingsStructure();
        
        // 移除自动文件存储初始化，改为由用户交互触发
        // 文件存储将在用户明确启用或选择文件时初始化
    }

    loadSettings() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // 验证加载的数据
                if (this.validateSettings(parsed)) {
                    return parsed;
                } else {
                    console.error('加载的数据无效，使用默认设置');
                    return this.defaultSettings;
                }
            } catch (e) {
                console.error('加载设置失败，使用默认设置', e);
                return this.defaultSettings;
            }
        }
        return this.defaultSettings;
    }

    saveSettings() {
        try {
            // 验证数据有效性
            if (!this.validateSettings(this.currentSettings)) {
                console.error('数据无效，保存失败');
                return false;
            }
            
            // 更新时间戳和校验和
            this.currentSettings.timestamp = Date.now();
            this.currentSettings.checksum = this.generateChecksum(this.currentSettings);
            
            // 确保数据结构完整
            this.ensureSettingsStructure();
            
            // 先保存到localStorage（同步，确保数据安全）
            localStorage.setItem(this.storageKey, JSON.stringify(this.currentSettings));
            console.log('设置已保存到localStorage');
            
            // 再异步保存到其他存储方案（如果启用了文件存储且已初始化存储适配器）
            if (this.isFileStorageEnabled && this.storageAdapter) {
                this.storageAdapter.saveStorage().then(success => {
                    if (success) {
                        console.log('设置已保存到文件存储');
                    } else {
                        console.warn('文件存储保存失败，但已保存到localStorage');
                    }
                }).catch(err => {
                    console.error('保存到文件存储失败，但已保存到localStorage:', err);
                });
            }
            
            return true;
        } catch (err) {
            console.error('保存设置失败:', err);
            // 尝试仅保存到localStorage作为最后的后备
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.currentSettings));
                console.log('已作为后备保存到localStorage');
                return true;
            } catch (localErr) {
                console.error('后备保存到localStorage也失败:', localErr);
                return false;
            }
        }
    }

    getNavigationItems() {
        return this.currentSettings.navigationItems;
    }

    addNavigationItem(item) {
        const newId = Math.max(...this.currentSettings.navigationItems.map(i => i.id), 0) + 1;
        const newItem = { id: newId, ...item };
        this.currentSettings.navigationItems.push(newItem);
        this.saveSettings();
        return newItem;
    }

    updateNavigationItem(id, updates) {
        const index = this.currentSettings.navigationItems.findIndex(item => item.id === id);
        if (index !== -1) {
            this.currentSettings.navigationItems[index] = { ...this.currentSettings.navigationItems[index], ...updates };
            this.saveSettings();
            return true;
        }
        return false;
    }

    deleteNavigationItem(id) {
        const index = this.currentSettings.navigationItems.findIndex(item => item.id === id);
        if (index !== -1) {
            this.currentSettings.navigationItems.splice(index, 1);
            this.saveSettings();
            return true;
        }
        return false;
    }

    moveNavigationItem(id, direction) {
        const index = this.currentSettings.navigationItems.findIndex(item => item.id === id);
        if (index === -1) return false;

        if (direction === 'up' && index > 0) {
            [this.currentSettings.navigationItems[index], this.currentSettings.navigationItems[index - 1]] = 
                [this.currentSettings.navigationItems[index - 1], this.currentSettings.navigationItems[index]];
            this.saveSettings();
            return true;
        } else if (direction === 'down' && index < this.currentSettings.navigationItems.length - 1) {
            [this.currentSettings.navigationItems[index], this.currentSettings.navigationItems[index + 1]] = 
                [this.currentSettings.navigationItems[index + 1], this.currentSettings.navigationItems[index]];
            this.saveSettings();
            return true;
        }
        return false;
    }

    reorderNavigationItems(newOrder) {
        try {
            this.currentSettings.navigationItems = newOrder;
            this.saveSettings();
            return true;
        } catch (e) {
            console.error('重新排序导航项失败', e);
            return false;
        }
    }

    getWallpaper() {
        return this.currentSettings.wallpaper;
    }

    setWallpaper(wallpaper) {
        this.currentSettings.wallpaper = wallpaper;
        this.saveSettings();
    }

    getLayout() {
        return this.currentSettings.layout;
    }

    updateLayout(updates) {
        this.currentSettings.layout = { ...this.currentSettings.layout, ...updates };
        this.saveSettings();
    }

    // 确保设置结构完整
    ensureSettingsStructure() {
        let isModified = false;
        
        // 确保currentSettings是对象
        if (!this.currentSettings || typeof this.currentSettings !== 'object') {
            console.error('currentSettings不是对象，使用默认设置');
            this.currentSettings = { ...this.defaultSettings };
            isModified = true;
        }
        
        // 确保基本属性存在且类型正确
        if (!this.currentSettings.version || typeof this.currentSettings.version !== 'string') {
            this.currentSettings.version = this.defaultSettings.version;
            isModified = true;
        }
        
        if (!this.currentSettings.timestamp || typeof this.currentSettings.timestamp !== 'number') {
            this.currentSettings.timestamp = Date.now();
            isModified = true;
        }
        
        if (!this.currentSettings.checksum || typeof this.currentSettings.checksum !== 'string') {
            this.currentSettings.checksum = this.generateChecksum(this.currentSettings);
            isModified = true;
        }
        
        // 确保导航项数组存在且格式正确
        if (!Array.isArray(this.currentSettings.navigationItems)) {
            this.currentSettings.navigationItems = [];
            isModified = true;
        }
        
        // 确保工具组数组存在且格式正确
        if (!Array.isArray(this.currentSettings.toolGroups)) {
            this.currentSettings.toolGroups = [];
            isModified = true;
        }
        
        // 确保布局设置存在且结构完整
        if (!this.currentSettings.layout || typeof this.currentSettings.layout !== 'object') {
            this.currentSettings.layout = { ...this.defaultSettings.layout };
            isModified = true;
        } else {
            // 确保布局的每个属性存在且类型正确
            if (typeof this.currentSettings.layout.columns !== 'number') {
                this.currentSettings.layout.columns = this.defaultSettings.layout.columns;
                isModified = true;
            }
            if (typeof this.currentSettings.layout.spacing !== 'number') {
                this.currentSettings.layout.spacing = this.defaultSettings.layout.spacing;
                isModified = true;
            }
            if (typeof this.currentSettings.layout.iconSize !== 'number') {
                this.currentSettings.layout.iconSize = this.defaultSettings.layout.iconSize;
                isModified = true;
            }
        }
        
        // 确保搜索设置存在且结构完整
        if (!this.currentSettings.search || typeof this.currentSettings.search !== 'object') {
            this.currentSettings.search = { ...this.defaultSettings.search };
            isModified = true;
        } else {
            // 确保搜索设置的每个属性存在且类型正确
            if (typeof this.currentSettings.search.engine !== 'string') {
                this.currentSettings.search.engine = this.defaultSettings.search.engine;
                isModified = true;
            }
            if (typeof this.currentSettings.search.opacity !== 'number') {
                this.currentSettings.search.opacity = this.defaultSettings.search.opacity;
                isModified = true;
            }
        }
        
        // 确保文字颜色设置存在且类型正确
        if (!this.currentSettings.textColor || typeof this.currentSettings.textColor !== 'string') {
            this.currentSettings.textColor = this.defaultSettings.textColor;
            isModified = true;
        }
        
        // 只有在实际修改了设置时才保存
        if (isModified) {
            console.log('设置结构已修复，保存更新后的设置');
            this.saveSettings();
        }
    }
    
    resetToDefault() {
        this.currentSettings = this.defaultSettings;
        this.saveSettings();
    }
    
    // 生成数据校验和
    generateChecksum(data) {
        const { checksum, ...dataWithoutChecksum } = data;
        const dataStr = JSON.stringify(dataWithoutChecksum);
        let hash = 0;
        for (let i = 0; i < dataStr.length; i++) {
            const char = dataStr.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
    
    // 验证数据校验和
    verifyChecksum(data) {
        if (!data.checksum) return false;
        const expectedChecksum = this.generateChecksum(data);
        return data.checksum === expectedChecksum;
    }
    
    // 检查浏览器是否支持文件系统访问API
    isFileSystemAPISupported() {
        try {
            // 检查核心API是否存在
            const hasSavePicker = typeof window.showSaveFilePicker === 'function';
            const hasOpenPicker = typeof window.showOpenFilePicker === 'function';
            const hasFileSystemWritable = typeof window.FileSystemWritableFileStream === 'function';
            
            const isSupported = hasSavePicker && hasOpenPicker && hasFileSystemWritable;
            
            if (!isSupported) {
                console.log('浏览器不支持File System Access API:', {
                    hasSavePicker,
                    hasOpenPicker,
                    hasFileSystemWritable,
                    browser: navigator.userAgent
                });
            }
            
            return isSupported;
        } catch (err) {
            console.error('检测File System Access API支持情况时出错:', err);
            return false;
        }
    }

    // 浏览器检测方法 - 增强版
    isFirefox() {
        try {
            // 多种检测方式结合，提高准确性
            const userAgent = navigator.userAgent.toLowerCase();
            const vendor = navigator.vendor || '';
            
            // 主要检测方式
            const isFirefoxUA = userAgent.includes('firefox') || userAgent.includes('mozilla/');
            const isNotChrome = !userAgent.includes('chrome') && !userAgent.includes('chromium');
            const isNotEdge = !userAgent.includes('edg/');
            const isNotSafari = !userAgent.includes('safari/') || vendor.toLowerCase().includes('mozilla');
            
            // Firefox特有属性检测
            const hasFirefoxProps = typeof window.mozInnerScreenX !== 'undefined';
            
            return isFirefoxUA && isNotChrome && isNotEdge && isNotSafari || hasFirefoxProps;
        } catch (err) {
            console.error('检测Firefox浏览器时出错:', err);
            // 出错时使用简单检测作为后备
            return navigator.userAgent.toLowerCase().includes('firefox');
        }
    }

    isTreaBrowser() {
        try {
            return navigator.userAgent.toLowerCase().includes('trea');
        } catch (err) {
            console.error('检测Trea浏览器时出错:', err);
            return false;
        }
    }
    
    // 检查浏览器是否支持IndexedDB
    isIndexedDBSupported() {
        try {
            return typeof window.indexedDB !== 'undefined';
        } catch (err) {
            console.error('检测IndexedDB支持情况时出错:', err);
            return false;
        }
    }

    // 存储适配器工厂方法
    createStorageAdapter() {
        try {
            // 优先选择File System Access API（提供最佳用户体验）
            if (this.isFileSystemAPISupported()) {
                console.log('使用File System Access API存储适配器');
                return new FileSystemAccessAdapter(this);
            }
            
            // 其次选择IndexedDB（跨浏览器兼容，提供持久化存储）
            if (this.isIndexedDBSupported()) {
                console.log('使用IndexedDB存储适配器');
                return new IndexedDBAdapter(this);
            }
            
            // 特殊处理Firefox浏览器，使用专用适配器
            if (this.isFirefox() || this.isTreaBrowser()) {
                console.log('使用Firefox存储适配器');
                return new FirefoxStorageAdapter(this);
            }
            
            // 最后选择LocalStorage作为后备方案
            console.log('使用LocalStorage存储适配器');
            return new LocalStorageAdapter(this);
        } catch (err) {
            console.error('创建存储适配器时出错:', err);
            // 出错时回退到LocalStorage
            return new LocalStorageAdapter(this);
        }
    }
    
    // 初始化文件存储
    async initFileStorage() {
        try {
            // 为所有浏览器创建存储适配器
            this.storageAdapter = this.createStorageAdapter();
            this.isFileStorageEnabled = true;
            
            // 初始化存储，确保数据加载
            await this.storageAdapter.openStorage();
            
            return true;
        } catch (err) {
            console.error('初始化文件存储失败:', err);
            this.isFileStorageEnabled = false;
            return false;
        }
    }
    
    // 创建新的存储文件
    async createStorageFile() {
        try {
            this.fileHandle = await window.showSaveFilePicker({
                suggestedName: this.storageFileName,
                types: [{ accept: { 'application/json': ['.json'] } }],
                excludeAcceptAllOption: true
            });
            
            // 写入初始数据
            await this.saveToFile();
            return true;
        } catch (err) {
            console.error('创建存储文件失败:', err);
            return false;
        }
    }
    
    // 打开现有存储文件
    async openStorageFile() {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ accept: { 'application/json': ['.json'] } }],
                excludeAcceptAllOption: true,
                multiple: false
            });
            
            this.fileHandle = handle;
            
            // 从文件加载数据
            const loaded = await this.loadFromFile();
            if (loaded) {
                return true;
            }
            
            // 如果加载失败，尝试从localStorage获取数据并保存到文件
            await this.saveToFile();
            return true;
        } catch (err) {
            console.error('打开存储文件失败:', err);
            return false;
        }
    }
    
    // 从文件加载数据
    async loadFromFile() {
        try {
            if (!this.fileHandle) {
                return false;
            }
            
            const file = await this.fileHandle.getFile();
            const fileContent = await file.text();
            const data = JSON.parse(fileContent);
            
            // 验证数据完整性
            if (this.verifyChecksum(data)) {
                this.currentSettings = data;
                this.ensureSettingsStructure();
                this.saveSettings(); // 同时更新localStorage作为备份
                return true;
            } else {
                console.error('数据校验失败，尝试恢复备份');
                return await this.restoreFromBackup();
            }
        } catch (err) {
            console.error('从文件加载数据失败:', err);
            return false;
        }
    }
    
    // 将数据保存到文件
    async saveToFile() {
        try {
            if (!this.fileHandle) {
                return false;
            }
            
            // 更新时间戳和校验和
            this.currentSettings.timestamp = Date.now();
            this.currentSettings.checksum = this.generateChecksum(this.currentSettings);
            
            // 创建原子更新：先写入临时文件，再替换原文件
            const writable = await this.fileHandle.createWritable({
                keepExistingData: false
            });
            
            await writable.write(JSON.stringify(this.currentSettings, null, 2));
            await writable.close();
            
            // 创建备份
            await this.backupFile();
            
            return true;
        } catch (err) {
            console.error('保存数据到文件失败:', err);
            return false;
        }
    }
    
    // 创建文件备份
    async backupFile() {
        try {
            if (!this.fileHandle) {
                return false;
            }
            
            // 创建备份文件
            const backupHandle = await window.showSaveFilePicker({
                suggestedName: this.backupFileName,
                types: [{ accept: { 'application/json': ['.json'] } }],
                excludeAcceptAllOption: true
            });
            
            const writable = await backupHandle.createWritable({
                keepExistingData: false
            });
            
            await writable.write(JSON.stringify(this.currentSettings, null, 2));
            await writable.close();
            
            return true;
        } catch (err) {
            console.error('创建备份失败:', err);
            return false;
        }
    }
    
    // 从备份恢复数据
    async restoreFromBackup() {
        try {
            const [handle] = await window.showOpenFilePicker({
                types: [{ accept: { 'application/json': ['.json'] } }],
                excludeAcceptAllOption: true,
                multiple: false
            });
            
            const file = await handle.getFile();
            const fileContent = await file.text();
            const data = JSON.parse(fileContent);
            
            if (this.verifyChecksum(data)) {
                this.currentSettings = data;
                this.ensureSettingsStructure();
                await this.saveToFile();
                this.saveSettings();
                return true;
            }
            
            return false;
        } catch (err) {
            console.error('从备份恢复失败:', err);
            return false;
        }
    }
    
    // 验证单个导航项
    validateItem(item) {
        if (!item || typeof item !== 'object') {
            return false;
        }
        
        // 验证必填字段
        if (!item.name || typeof item.name !== 'string') {
            return false;
        }
        
        if (!item.url || typeof item.url !== 'string') {
            return false;
        }
        
        // 验证URL格式
        try {
            new URL(item.url);
        } catch (e) {
            return false;
        }
        
        // 验证可选字段
        if (item.id !== undefined && typeof item.id !== 'number') {
            return false;
        }
        
        if (item.icon !== undefined && typeof item.icon !== 'string') {
            return false;
        }
        
        if (item.toolGroupId !== undefined && typeof item.toolGroupId !== 'number' && item.toolGroupId !== null) {
            return false;
        }
        
        return true;
    }
    
    // 验证navigationItems数组
    validateNavigationItems(items) {
        if (!Array.isArray(items)) {
            return false;
        }
        
        // 验证每个导航项
        for (const item of items) {
            if (!this.validateItem(item)) {
                return false;
            }
        }
        
        // 验证id唯一性
        const ids = items.map(item => item.id).filter(id => id !== undefined);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
            return false;
        }
        
        return true;
    }
    
    // 验证完整设置数据
    validateSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            return false;
        }
        
        // 验证navigationItems
        if (!this.validateNavigationItems(settings.navigationItems)) {
            return false;
        }
        
        // 验证其他必要字段
        if (!settings.layout || typeof settings.layout !== 'object') {
            return false;
        }
        
        if (!settings.search || typeof settings.search !== 'object') {
            return false;
        }
        
        if (settings.toolGroups !== undefined && !Array.isArray(settings.toolGroups)) {
            return false;
        }
        
        return true;
    }

    exportSettings() {
        const dataStr = JSON.stringify(this.currentSettings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        return URL.createObjectURL(dataBlob);
    }
    
    // 使用File System API导出设置
    async exportSettingsWithFileSystem() {
        try {
            if (!this.isFileSystemAPISupported()) {
                console.error('浏览器不支持File System Access API');
                return false;
            }
            
            // 更新时间戳和校验和
            this.currentSettings.timestamp = Date.now();
            this.currentSettings.checksum = this.generateChecksum(this.currentSettings);
            
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: `nav-settings-${new Date().toISOString().split('T')[0]}.json`,
                types: [{ accept: { 'application/json': ['.json'] } }],
                excludeAcceptAllOption: true
            });
            
            const writable = await fileHandle.createWritable({
                keepExistingData: false
            });
            
            await writable.write(JSON.stringify(this.currentSettings, null, 2));
            await writable.close();
            
            return true;
        } catch (err) {
            console.error('使用File System API导出失败:', err);
            return false;
        }
    }
    
    // 使用File System API导入设置
    async importSettingsWithFileSystem() {
        try {
            if (!this.isFileSystemAPISupported()) {
                console.error('浏览器不支持File System Access API');
                return false;
            }
            
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{ accept: { 'application/json': ['.json'] } }],
                excludeAcceptAllOption: true,
                multiple: false
            });
            
            const file = await fileHandle.getFile();
            const fileContent = await file.text();
            
            return this.importSettings(fileContent);
        } catch (err) {
            console.error('使用File System API导入失败:', err);
            return false;
        }
    }

    importSettings(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            
            // 确保必要属性存在
            if (!imported.toolGroups) {
                imported.toolGroups = [];
            }
            if (!imported.search) {
                imported.search = this.defaultSettings.search;
            }
            if (!imported.layout) {
                imported.layout = this.defaultSettings.layout;
            }
            if (!imported.navigationItems) {
                imported.navigationItems = [];
            }
            
            // 验证导入的数据
            if (this.validateSettings(imported)) {
                this.currentSettings = imported;
                this.ensureSettingsStructure();
                this.saveSettings();
                return true;
            } else {
                console.error('导入的数据无效');
                return false;
            }
        } catch (e) {
            console.error('导入设置失败', e);
            return false;
        }
    }

    // 工具组相关方法
    getToolGroups() {
        return this.currentSettings.toolGroups;
    }

    addToolGroup(group) {
        const newId = Math.max(...this.currentSettings.toolGroups.map(g => g.id), 0) + 1;
        const newGroup = { id: newId, name: '新工具组', items: [], ...group };
        this.currentSettings.toolGroups.push(newGroup);
        this.saveSettings();
        return newGroup;
    }

    updateToolGroup(id, updates) {
        const index = this.currentSettings.toolGroups.findIndex(group => group.id === id);
        if (index !== -1) {
            this.currentSettings.toolGroups[index] = { ...this.currentSettings.toolGroups[index], ...updates };
            this.saveSettings();
            return true;
        }
        return false;
    }

    deleteToolGroup(id) {
        const index = this.currentSettings.toolGroups.findIndex(group => group.id === id);
        if (index !== -1) {
            this.currentSettings.toolGroups.splice(index, 1);
            this.saveSettings();
            return true;
        }
        return false;
    }

    addItemToToolGroup(groupId, item) {
        const group = this.currentSettings.toolGroups.find(g => g.id === groupId);
        if (group) {
            // 确保item有id
            if (!item.id) {
                const newId = Math.max(...group.items.map(i => i.id), 0) + 1;
                item.id = newId;
            }
            group.items.push(item);
            this.saveSettings();
            return true;
        }
        return false;
    }

    removeItemFromToolGroup(groupId, itemId) {
        const group = this.currentSettings.toolGroups.find(g => g.id === groupId);
        if (group) {
            const index = group.items.findIndex(item => item.id === itemId);
            if (index !== -1) {
                group.items.splice(index, 1);
                this.saveSettings();
                return true;
            }
        }
        return false;
    }

    // 搜索设置相关方法
    getSearchSettings() {
        return this.currentSettings.search;
    }

    updateSearchSettings(updates) {
        this.currentSettings.search = { ...this.currentSettings.search, ...updates };
        this.saveSettings();
        return true;
    }

    getSearchEngine() {
        return this.currentSettings.search.engine;
    }

    setSearchEngine(engine) {
        this.currentSettings.search.engine = engine;
        this.saveSettings();
    }

    getSearchOpacity() {
        return this.currentSettings.search.opacity;
    }

    setSearchOpacity(opacity) {
        this.currentSettings.search.opacity = opacity;
        this.saveSettings();
    }

    getTextColor() {
        return this.currentSettings.textColor;
    }

    setTextColor(color) {
        this.currentSettings.textColor = color;
        this.saveSettings();
    }
}

// 主应用类：负责UI渲染、事件处理和用户交互
class NavigationApp {
    constructor() {
        this.model = new NavigationModel();
        this.currentContextMenu = null;
        this.currentEditItemId = null;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.renderNavigationGrid();
        this.updateWallpaper();
        this.updateLayoutControls();
        this.renderNavList();
        this.renderToolgroupList();
        this.initSearchSettings();
        this.initTextColorSettings();
        this.hideAllMenus();
    }

    // 初始化文字颜色设置
    initTextColorSettings() {
        const textColor = this.model.getTextColor();
        this.textColorPicker.value = textColor;
        this.textColorHexInput.value = textColor;
        this.updateColorPreview(textColor);
    }

    // 更新文字颜色
    updateTextColor(color) {
        this.model.setTextColor(color);
        this.textColorHexInput.value = color;
        this.updateColorPreview(color);
        this.renderNavigationGrid();
    }

    // 从十六进制输入更新文字颜色
    updateTextColorFromHex(hexValue) {
        // 验证十六进制颜色格式
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (hexRegex.test(hexValue)) {
            this.model.setTextColor(hexValue);
            this.textColorPicker.value = hexValue;
            this.updateColorPreview(hexValue);
            this.renderNavigationGrid();
        }
    }

    // 恢复默认文字颜色
    resetTextColor() {
        const defaultColor = this.model.defaultSettings.textColor;
        this.updateTextColor(defaultColor);
    }

    // 更新颜色预览
    updateColorPreview(color) {
        this.colorPreview.style.color = color;
    }

    cacheElements() {
        // 主元素
        this.wallpaperElement = document.getElementById('wallpaper');
        this.navGrid = document.getElementById('nav-grid');
        this.settingsPanel = document.getElementById('settings-panel');
        this.settingsToggle = document.getElementById('settings-toggle');
        this.closeSettings = document.getElementById('close-settings');
        this.addNavBtn = document.getElementById('add-nav-btn');

        // 搜索相关元素
        this.searchComponent = document.querySelector('.search-component');
        this.searchEngineSelect = document.getElementById('search-engine');
        this.searchInput = document.getElementById('search-input');

        // 右键菜单
        this.iconContextMenu = document.getElementById('icon-context-menu');
        this.wallpaperContextMenu = document.getElementById('wallpaper-context-menu');
        this.toolgroupContextMenu = document.getElementById('toolgroup-context-menu');

        // 工具组相关元素
        this.toolgroupPanel = document.getElementById('toolgroup-panel');
        this.toolgroupPanelTitle = document.getElementById('toolgroup-panel-title');
        this.closeToolgroupPanelBtn = document.getElementById('close-toolgroup-panel');
        this.toolgroupItems = document.getElementById('toolgroup-items');
        this.toolgroupSelectModal = document.getElementById('toolgroup-select-modal');
        this.toolgroupSelectList = document.getElementById('toolgroup-select-list');
        this.createNewToolgroupBtn = document.getElementById('create-new-toolgroup');
        this.selectToolgroupBtn = document.querySelector('.select-toolgroup');
        this.toolgroupEditModal = document.getElementById('toolgroup-edit-modal');
        this.toolgroupEditTitle = document.getElementById('toolgroup-edit-title');
        this.toolgroupEditForm = document.getElementById('toolgroup-edit-form');
        this.toolgroupNameInput = document.getElementById('toolgroup-name');
        
        // 确认删除模态框
        this.confirmDeleteModal = document.getElementById('confirm-delete-modal');
        this.confirmDeleteMessage = document.getElementById('confirm-delete-message');
        this.confirmDeleteOk = document.getElementById('confirm-delete-ok');
        this.confirmDeleteCancel = document.getElementById('confirm-delete-cancel');

        // 设置面板元素
        this.wallpaperUpload = document.getElementById('wallpaper-upload');
        this.wallpaperPreview = document.getElementById('wallpaper-preview');
        this.resetWallpaperBtn = document.getElementById('reset-wallpaper');
        this.navList = document.getElementById('nav-list');
        this.addNavItemBtn = document.getElementById('add-nav-item');
        this.toolgroupList = document.getElementById('toolgroup-list');
        this.addToolgroupBtn = document.getElementById('add-toolgroup');
        this.columnsSlider = document.getElementById('columns');
        this.columnsValue = document.getElementById('columns-value');
        this.spacingSlider = document.getElementById('spacing');
        this.spacingValue = document.getElementById('spacing-value');
        this.iconSizeSlider = document.getElementById('icon-size');
        this.iconSizeValue = document.getElementById('icon-size-value');
        this.searchOpacitySlider = document.getElementById('search-opacity');
        this.searchOpacityValue = document.getElementById('search-opacity-value');
        this.exportDataBtn = document.getElementById('export-data');
        this.importDataBtn = document.getElementById('import-data');
        this.importFile = document.getElementById('import-file');
        this.resetDataBtn = document.getElementById('reset-data');
        
        // 文件存储控制
        this.enableFileStorageCheckbox = document.getElementById('enable-file-storage');
        this.selectStorageFileBtn = document.getElementById('select-storage-file');
        this.manualBackupBtn = document.getElementById('manual-backup');
        this.restoreBackupBtn = document.getElementById('restore-backup');

        // 外观设置相关元素
        this.textColorPicker = document.getElementById('text-color');
        this.textColorHexInput = document.getElementById('text-color-hex');
        this.colorPreview = document.getElementById('color-preview');
        this.resetTextColorBtn = document.getElementById('reset-text-color');

        // 编辑模态框
        this.editModal = document.getElementById('edit-modal');
        this.editForm = document.getElementById('edit-form');
        this.editName = document.getElementById('edit-name');
        this.editUrl = document.getElementById('edit-url');
        this.editIcon = document.getElementById('edit-icon');
        this.iconPreview = document.getElementById('icon-preview');
        this.saveAndContinueBtn = document.getElementById('save-and-continue');
        
        // 编辑现有导航项模态框
        this.editExistingModal = document.getElementById('edit-existing-modal');
        this.editExistingForm = document.getElementById('edit-existing-form');
        this.editExistingName = document.getElementById('edit-existing-name');
        this.editExistingUrl = document.getElementById('edit-existing-url');
        this.editExistingIcon = document.getElementById('edit-existing-icon');
        this.iconExistingPreview = document.getElementById('icon-existing-preview');
        
        this.closeModalBtns = document.querySelectorAll('.close-modal');

        // 消息提示
        this.toast = document.getElementById('toast');
        
        // 图标获取相关状态
        this.manualIconSelected = {
            new: false,
            existing: false
        };
    }

    bindEvents() {
        // 设置面板切换
        this.settingsToggle.addEventListener('click', () => this.toggleSettingsPanel());
        this.closeSettings.addEventListener('click', () => this.closeSettingsPanel());

        // 壁纸右键菜单
        this.wallpaperElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, this.wallpaperContextMenu);
        });

        // 壁纸设置
        this.wallpaperUpload.addEventListener('change', (e) => this.handleWallpaperUpload(e));
        this.resetWallpaperBtn.addEventListener('click', () => this.resetWallpaper());

        // 布局调整
        this.columnsSlider.addEventListener('input', () => this.updateLayout());
        this.spacingSlider.addEventListener('input', () => this.updateLayout());
        this.iconSizeSlider.addEventListener('input', () => this.updateLayout());
        this.searchOpacitySlider.addEventListener('input', () => this.updateSearchOpacitySetting());

        // 数据管理
        this.exportDataBtn.addEventListener('click', () => this.exportSettings());
        this.importDataBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.handleImportFile(e));
        this.resetDataBtn.addEventListener('click', () => this.resetSettings());
        
        // 文件存储控制
        this.enableFileStorageCheckbox.addEventListener('change', (e) => this.toggleFileStorage(e.target.checked));
        this.selectStorageFileBtn.addEventListener('click', () => this.selectStorageFile());
        this.manualBackupBtn.addEventListener('click', () => this.performManualBackup());
        this.restoreBackupBtn.addEventListener('click', () => this.restoreFromManualBackup());

        // 外观设置事件
        this.textColorPicker.addEventListener('input', (e) => this.updateTextColor(e.target.value));
        this.textColorHexInput.addEventListener('input', (e) => this.updateTextColorFromHex(e.target.value));
        this.resetTextColorBtn.addEventListener('click', () => this.resetTextColor());

        // 导航管理
        this.addNavItemBtn.addEventListener('click', () => this.openEditModal());
        this.addNavBtn.addEventListener('click', () => this.openEditModal());

        // 编辑模态框
        this.editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
        this.editIcon.addEventListener('change', (e) => this.previewIcon(e));
        this.saveAndContinueBtn.addEventListener('click', () => this.handleSaveAndContinue());
        
        // 编辑现有导航项模态框事件绑定
        this.editExistingForm.addEventListener('submit', (e) => this.handleEditExistingSubmit(e));
        this.editExistingIcon.addEventListener('change', (e) => this.previewExistingIcon(e));
        
        // 自动获取图标事件监听
        this.editUrl.addEventListener('blur', () => this.autoGetFavicon(this.editUrl, this.iconPreview));
        this.editUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.autoGetFavicon(this.editUrl, this.iconPreview);
            }
        });
        
        this.editExistingUrl.addEventListener('blur', () => this.autoGetFavicon(this.editExistingUrl, this.iconExistingPreview));
        this.editExistingUrl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.autoGetFavicon(this.editExistingUrl, this.iconExistingPreview);
            }
        });
        
        this.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeEditModal();
                this.closeEditExistingModal();
                this.closeToolgroupEditModal();
                this.toolgroupSelectModal.classList.remove('active');
                this.confirmDeleteModal.classList.remove('active');
                this.confirmDeleteCallback = null;
            });
        });

        // 工具组相关事件
        // 关闭工具组面板
        this.closeToolgroupPanelBtn.addEventListener('click', () => {
            this.closeToolgroupPanel();
        });
        // 点击面板外部关闭
        this.toolgroupPanel.addEventListener('click', (e) => {
            if (e.target === this.toolgroupPanel) {
                this.closeToolgroupPanel();
            }
        });

        // 工具组选择模态框
        this.createNewToolgroupBtn.addEventListener('click', () => {
            this.toolgroupSelectModal.classList.remove('active');
            // 保存当前要添加到工具组的导航项ID
            this.tempAddToToolgroupId = this.currentEditItemId;
            this.openToolgroupEditModal();
        });

        this.selectToolgroupBtn.addEventListener('click', () => {
            const selectedGroupId = document.querySelector('input[name="toolgroup"]:checked');
            if (selectedGroupId) {
                const groupId = parseInt(selectedGroupId.value);
                const navItem = this.model.getNavigationItems().find(item => item.id === this.currentEditItemId);
                if (navItem) {
                    const addResult = this.model.addItemToToolGroup(groupId, navItem);
                    if (addResult) {
                        // 删除原导航项
                        const deleteResult = this.model.deleteNavigationItem(this.currentEditItemId);
                        if (deleteResult) {
                            this.renderNavList();
                            this.renderToolgroupList();
                            this.renderNavigationGrid();
                            this.showToast('已添加到工具组');
                        } else {
                            this.showToast('添加到工具组失败，请重试', 'error');
                        }
                    } else {
                        this.showToast('添加到工具组失败，请重试', 'error');
                    }
                }
            } else {
                this.showToast('请选择一个工具组', 'error');
            }
            this.toolgroupSelectModal.classList.remove('active');
            this.currentEditItemId = null;
        });

        // 工具组编辑模态框
        this.toolgroupEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = this.toolgroupNameInput.value.trim();
            if (!name) {
                this.showToast('请输入工具组名称', 'error');
                return;
            }

            let newGroupId = null;
            if (this.currentEditItemId) {
                // 更新现有工具组
                this.model.updateToolGroup(this.currentEditItemId, { name });
                this.showToast('工具组已更新');
            } else {
                // 创建新工具组
                const newGroup = this.model.addToolGroup({ name });
                newGroupId = newGroup.id;
                this.showToast('工具组已创建');
            }

            // 检查是否有要添加到工具组的导航项
            if (this.tempAddToToolgroupId && newGroupId) {
                const navItem = this.model.getNavigationItems().find(item => item.id === this.tempAddToToolgroupId);
                if (navItem) {
                    const addResult = this.model.addItemToToolGroup(newGroupId, navItem);
                    if (addResult) {
                        // 删除原导航项
                        const deleteResult = this.model.deleteNavigationItem(this.tempAddToToolgroupId);
                        if (deleteResult) {
                            this.renderNavList();
                            this.renderToolgroupList();
                            this.renderNavigationGrid();
                            this.showToast('已将导航项添加到新工具组');
                        } else {
                            this.model.deleteToolGroup(newGroupId);
                            this.showToast('添加到工具组失败，请重试', 'error');
                        }
                    } else {
                        this.model.deleteToolGroup(newGroupId);
                        this.showToast('添加到工具组失败，请重试', 'error');
                    }
                }
                this.tempAddToToolgroupId = null;
            }

            this.renderNavigationGrid();
            this.renderToolgroupList();
            this.closeToolgroupEditModal();
        });

        // 工具组管理
        this.addToolgroupBtn.addEventListener('click', () => this.openToolgroupEditModal());

        // 全局点击关闭菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideAllMenus();
            }
        });

        // 搜索相关事件
        this.searchEngineSelect.addEventListener('change', (e) => {
            this.handleSearchEngineChange(e.target.value);
        });

        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // 确认删除模态框事件
        this.confirmDeleteOk.addEventListener('click', () => {
            this.confirmDeleteAction();
        });
        
        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllMenus();
                this.closeEditModal();
                this.closeEditExistingModal();
                this.closeToolgroupEditModal();
                this.closeSettingsPanel();
                this.toolgroupSelectModal.classList.remove('active');
                this.confirmDeleteModal.classList.remove('active');
            }
        });
    }

    // 导航网格渲染
    renderNavigationGrid() {
        const items = this.model.getNavigationItems();
        const toolGroups = this.model.getToolGroups();
        const layout = this.model.getLayout();

        // 创建文档片段，减少DOM操作次数
        const fragment = document.createDocumentFragment();

        // 更新网格样式
        // 修复列数计算逻辑：列数越多，每列宽度越小，从而显示更多列
        const baseWidth = 200;
        const widthDecrement = 15;
        const minItemWidth = Math.max(80, baseWidth - (layout.columns - 6) * widthDecrement);
        this.navGrid.style.gridTemplateColumns = `repeat(${layout.columns}, minmax(${minItemWidth}px, 1fr))`;
        this.navGrid.style.gap = `${layout.spacing}px`;

        // 渲染普通导航项
        items.forEach(item => {
            const navItem = this.createNavItem(item, layout);
            fragment.appendChild(navItem);
        });

        // 渲染工具组项
        toolGroups.forEach(group => {
            const groupItem = this.createToolgroupItem(group, layout);
            fragment.appendChild(groupItem);
        });

        // 一次性将所有元素添加到DOM中
        this.navGrid.innerHTML = '';
        this.navGrid.appendChild(fragment);
    }
    
    // 创建单个导航项元素
    createNavItem(item, layout) {
        const navItem = document.createElement('a');
        navItem.href = item.url;
        navItem.target = '_blank';
        navItem.className = 'nav-item';
        navItem.dataset.id = item.id;
        navItem.dataset.type = 'nav-item';
        navItem.style.setProperty('--icon-size', `${layout.iconSize}px`);
        navItem.style.color = this.model.getTextColor();
        navItem.draggable = true;

        // 创建导航项图标元素
        const iconDiv = document.createElement('div');
        iconDiv.className = 'nav-item-icon';
        iconDiv.style.width = `${layout.iconSize}px`;
        iconDiv.style.height = `${layout.iconSize}px`;
        iconDiv.style.fontSize = `${layout.iconSize * 0.6}px`;
        
        // 根据图标类型设置显示方式
        if (item.icon) {
            if (item.icon.startsWith('http') || item.icon.startsWith('data:image')) {
                // 如果是URL，设置为背景图片
                iconDiv.style.backgroundImage = `url(${item.icon})`;
                iconDiv.style.backgroundSize = 'cover';
                iconDiv.style.backgroundRepeat = 'no-repeat';
                iconDiv.style.backgroundPosition = 'center';
                iconDiv.textContent = '';
            } else {
                // 否则作为文本显示
                iconDiv.style.backgroundImage = '';
                iconDiv.textContent = item.icon;
            }
        } else {
            // 默认图标
            iconDiv.style.backgroundImage = '';
            iconDiv.textContent = '🔗';
        }
        
        // 创建导航项名称元素
        const nameDiv = document.createElement('div');
        nameDiv.className = 'nav-item-name';
        nameDiv.textContent = item.name;
        
        // 将元素添加到导航项中
        navItem.appendChild(iconDiv);
        navItem.appendChild(nameDiv);

        // 右键菜单
        navItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.currentEditItemId = item.id;
            this.showContextMenu(e, this.iconContextMenu);
        });

        // 拖拽事件
        navItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'nav-item',
                id: item.id
            }));
            navItem.style.opacity = '0.5';
            navItem.classList.add('dragging');
        });

        navItem.addEventListener('dragend', () => {
            navItem.style.opacity = '1';
            navItem.classList.remove('dragging');
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        });

        navItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            navItem.classList.add('drag-over');
        });

        navItem.addEventListener('dragleave', () => {
            navItem.classList.remove('drag-over');
        });

        navItem.addEventListener('drop', (e) => {
            e.preventDefault();
            navItem.classList.remove('drag-over');

            try {
                const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (draggedData.type === 'nav-item') {
                    if (draggedData.id !== item.id) {
                        // 获取当前所有导航项
                        const items = [...this.model.getNavigationItems()];
                        // 找到拖拽项和目标项的索引
                        const draggedIndex = items.findIndex(i => i.id === draggedData.id);
                        const targetIndex = items.findIndex(i => i.id === item.id);
                        
                        if (draggedIndex !== -1 && targetIndex !== -1) {
                            // 重新排序
                            const [draggedItem] = items.splice(draggedIndex, 1);
                            items.splice(targetIndex, 0, draggedItem);
                            
                            // 保存新顺序
                            const success = this.model.reorderNavigationItems(items);
                            if (success) {
                                // 重新渲染导航网格
                                this.renderNavigationGrid();
                                this.showToast('排序已保存');
                            } else {
                                this.showToast('排序保存失败', 'error');
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('拖拽数据解析失败:', error);
                this.showToast('排序失败', 'error');
            }
        });

        return navItem;
    }
    
    // 创建单个工具组项元素
    createToolgroupItem(group, layout) {
        const groupItem = document.createElement('div');
        groupItem.className = 'nav-item toolgroup-item';
        groupItem.dataset.id = group.id;
        groupItem.dataset.type = 'toolgroup';
        groupItem.style.setProperty('--icon-size', `${layout.iconSize}px`);
        groupItem.style.color = this.model.getTextColor();
        groupItem.draggable = true;

        // 生成工具组缩略图（显示前4个图标）
        const previewIcons = group.items.slice(0, 4).map(item => item.icon || '🔗').join('');
        const emptySlots = Math.max(0, 4 - group.items.length);
        const placeholderIcons = '⬜'.repeat(emptySlots);
        const allPreviewIcons = previewIcons + placeholderIcons;

        groupItem.innerHTML = `
            <div class="nav-item-icon toolgroup-icon" style="width: ${layout.iconSize}px; height: ${layout.iconSize}px; font-size: ${layout.iconSize * 0.35}px">
                <div class="toolgroup-preview-icons">${allPreviewIcons}</div>
            </div>
            <div class="nav-item-name">${group.name}</div>
            <div class="toolgroup-item-count">(${group.items.length}项)</div>
        `;

        // 点击事件：展开工具组面板
        groupItem.addEventListener('click', () => {
            this.openToolgroupPanel(group.id);
        });

        // 右键菜单
        groupItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.currentEditItemId = group.id;
            this.showContextMenu(e, this.toolgroupContextMenu);
        });

        // 拖拽事件
        groupItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'toolgroup',
                id: group.id
            }));
            groupItem.style.opacity = '0.5';
        });

        groupItem.addEventListener('dragend', () => {
            groupItem.style.opacity = '1';
        });

        groupItem.addEventListener('dragover', (e) => {
            e.preventDefault();
            groupItem.classList.add('drag-over');
        });

        groupItem.addEventListener('dragleave', () => {
            groupItem.classList.remove('drag-over');
        });

        groupItem.addEventListener('drop', (e) => {
            e.preventDefault();
            groupItem.classList.remove('drag-over');

            try {
                const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (draggedData.type === 'nav-item') {
                    // 将导航项添加到工具组
                    const navItem = this.model.getNavigationItems().find(i => i.id === draggedData.id);
                    if (navItem) {
                        const addResult = this.model.addItemToToolGroup(group.id, navItem);
                        if (addResult) {
                            // 删除原导航项
                            const deleteResult = this.model.deleteNavigationItem(draggedData.id);
                            if (deleteResult) {
                                this.renderNavList();
                                this.renderToolgroupList();
                                this.renderNavigationGrid();
                                this.showToast('已添加到工具组');
                            } else {
                                this.showToast('添加到工具组失败，请重试', 'error');
                            }
                        } else {
                            this.showToast('添加到工具组失败，请重试', 'error');
                        }
                    }
                }
            } catch (error) {
                console.error('拖拽数据解析失败:', error);
            }
        });

        return groupItem;
    }
    
    // 原始导航网格渲染方法（已优化）
    renderNavigationGridOld() {
        this.navGrid.innerHTML = '';
        const items = this.model.getNavigationItems();
        const toolGroups = this.model.getToolGroups();
        const layout = this.model.getLayout();

        // 更新网格样式
        this.navGrid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${120 - (5 - layout.columns) * 10}px, 1fr))`;
        this.navGrid.style.gap = `${layout.spacing}px`;

        // 渲染普通导航项
        items.forEach(item => {
            const navItem = document.createElement('a');
            navItem.href = item.url;
            navItem.target = '_blank';
            navItem.className = 'nav-item';
            navItem.dataset.id = item.id;
            navItem.dataset.type = 'nav-item';
            navItem.style.setProperty('--icon-size', `${layout.iconSize}px`);
            navItem.draggable = true;

            navItem.innerHTML = `
                <div class="nav-item-icon" style="width: ${layout.iconSize}px; height: ${layout.iconSize}px; font-size: ${layout.iconSize * 0.6}px">
                    ${item.icon || '🔗'}
                </div>
                <div class="nav-item-name">${item.name}</div>
            `;

            // 右键菜单
            navItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.currentEditItemId = item.id;
                this.showContextMenu(e, this.iconContextMenu);
            });

            // 拖拽事件
            navItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'nav-item',
                    id: item.id
                }));
                navItem.style.opacity = '0.5';
                navItem.classList.add('dragging');
            });

            navItem.addEventListener('dragend', () => {
                navItem.style.opacity = '1';
                navItem.classList.remove('dragging');
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            });

            navItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                navItem.classList.add('drag-over');
            });

            navItem.addEventListener('dragleave', () => {
                navItem.classList.remove('drag-over');
            });

            navItem.addEventListener('drop', (e) => {
                e.preventDefault();
                navItem.classList.remove('drag-over');

                try {
                    const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (draggedData.type === 'nav-item') {
                        if (draggedData.id !== item.id) {
                            // 获取当前所有导航项
                            const items = [...this.model.getNavigationItems()];
                            // 找到拖拽项和目标项的索引
                            const draggedIndex = items.findIndex(i => i.id === draggedData.id);
                            const targetIndex = items.findIndex(i => i.id === item.id);
                            
                            if (draggedIndex !== -1 && targetIndex !== -1) {
                                // 重新排序
                                const [draggedItem] = items.splice(draggedIndex, 1);
                                items.splice(targetIndex, 0, draggedItem);
                                
                                // 保存新顺序
                                const success = this.model.reorderNavigationItems(items);
                                if (success) {
                                    // 重新渲染导航网格
                                    this.renderNavigationGrid();
                                    this.showToast('排序已保存');
                                } else {
                                    this.showToast('排序保存失败', 'error');
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('拖拽数据解析失败:', error);
                    this.showToast('排序失败', 'error');
                }
            });

            this.navGrid.appendChild(navItem);
        });

        // 渲染工具组项
        toolGroups.forEach(group => {
            const groupItem = document.createElement('div');
            groupItem.className = 'nav-item toolgroup-item';
            groupItem.dataset.id = group.id;
            groupItem.dataset.type = 'toolgroup';
            groupItem.style.setProperty('--icon-size', `${layout.iconSize}px`);
            groupItem.draggable = true;

            // 生成工具组缩略图（显示前4个图标）
            const previewIcons = group.items.slice(0, 4).map(item => item.icon || '🔗').join('');
            const emptySlots = Math.max(0, 4 - group.items.length);
            const placeholderIcons = '⬜'.repeat(emptySlots);
            const allPreviewIcons = previewIcons + placeholderIcons;

            groupItem.innerHTML = `
                <div class="nav-item-icon toolgroup-icon" style="width: ${layout.iconSize}px; height: ${layout.iconSize}px; font-size: ${layout.iconSize * 0.35}px">
                    <div class="toolgroup-preview-icons">${allPreviewIcons}</div>
                </div>
                <div class="nav-item-name">${group.name}</div>
                <div class="toolgroup-item-count">(${group.items.length}项)</div>
            `;

            // 点击事件：展开工具组面板
            groupItem.addEventListener('click', () => {
                this.openToolgroupPanel(group.id);
            });

            // 右键菜单
            groupItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.currentEditItemId = group.id;
                this.showContextMenu(e, this.toolgroupContextMenu);
            });

            // 拖拽事件
            groupItem.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    type: 'toolgroup',
                    id: group.id
                }));
                groupItem.style.opacity = '0.5';
            });

            groupItem.addEventListener('dragend', () => {
                groupItem.style.opacity = '1';
            });

            groupItem.addEventListener('dragover', (e) => {
                e.preventDefault();
                groupItem.classList.add('drag-over');
            });

            groupItem.addEventListener('dragleave', () => {
                groupItem.classList.remove('drag-over');
            });

            groupItem.addEventListener('drop', (e) => {
                e.preventDefault();
                groupItem.classList.remove('drag-over');

                try {
                    const draggedData = JSON.parse(e.dataTransfer.getData('text/plain'));
                    if (draggedData.type === 'nav-item') {
                        // 将导航项添加到工具组
                        const navItem = this.model.getNavigationItems().find(i => i.id === draggedData.id);
                        if (navItem) {
                            const addResult = this.model.addItemToToolGroup(group.id, navItem);
                            if (addResult) {
                                // 删除原导航项
                                const deleteResult = this.model.deleteNavigationItem(draggedData.id);
                                if (deleteResult) {
                                    this.renderNavList();
                                    this.renderToolgroupList();
                                    this.renderNavigationGrid();
                                    this.showToast('已添加到工具组');
                                } else {
                                    this.showToast('添加到工具组失败，请重试', 'error');
                                }
                            } else {
                                this.showToast('添加到工具组失败，请重试', 'error');
                            }
                        }
                    }
                } catch (error) {
                    console.error('拖拽数据解析失败:', error);
                }
            });

            this.navGrid.appendChild(groupItem);
        });
    }

    // 壁纸相关
    updateWallpaper() {
        const wallpaper = this.model.getWallpaper();
        if (wallpaper) {
            // 设置壁纸元素样式
            this.wallpaperElement.style.backgroundImage = `url(${wallpaper})`;
            this.wallpaperElement.style.backgroundSize = 'cover';
            this.wallpaperElement.style.backgroundRepeat = 'no-repeat';
            this.wallpaperElement.style.backgroundPosition = 'center';
            this.wallpaperElement.style.backgroundAttachment = 'fixed';
            
            // 设置壁纸预览元素样式
            if (this.wallpaperPreview) {
                this.wallpaperPreview.style.backgroundImage = `url(${wallpaper})`;
                this.wallpaperPreview.style.backgroundSize = 'cover';
                this.wallpaperPreview.style.backgroundRepeat = 'no-repeat';
                this.wallpaperPreview.style.backgroundPosition = 'center';
            }
        } else {
            // 恢复默认背景
            this.wallpaperElement.style.backgroundImage = '';
            this.wallpaperElement.style.backgroundSize = 'cover';
            this.wallpaperElement.style.backgroundRepeat = 'no-repeat';
            this.wallpaperElement.style.backgroundPosition = 'center';
            this.wallpaperElement.style.backgroundAttachment = 'fixed';
            
            if (this.wallpaperPreview) {
                this.wallpaperPreview.style.backgroundImage = '';
            }
        }
    }

    handleWallpaperUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('请选择图片文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            this.model.setWallpaper(dataUrl);
            this.updateWallpaper();
            this.showToast('壁纸设置成功');
        };
        reader.readAsDataURL(file);
    }

    resetWallpaper() {
        this.model.setWallpaper('');
        this.updateWallpaper();
        this.showToast('已恢复默认壁纸');
    }

    // 布局调整
    updateLayoutControls() {
        const layout = this.model.getLayout();
        this.columnsSlider.value = layout.columns;
        this.columnsValue.textContent = layout.columns;
        this.spacingSlider.value = layout.spacing;
        this.spacingValue.textContent = layout.spacing;
        this.iconSizeSlider.value = layout.iconSize;
        this.iconSizeValue.textContent = layout.iconSize;
        
        // 设置搜索透明度滑块
        const searchSettings = this.model.getSearchSettings();
        this.searchOpacitySlider.value = Math.round((1 - searchSettings.opacity) * 100);
        this.searchOpacityValue.textContent = Math.round((1 - searchSettings.opacity) * 100);
    }

    updateLayout() {
        const layout = {
            columns: parseInt(this.columnsSlider.value),
            spacing: parseInt(this.spacingSlider.value),
            iconSize: parseInt(this.iconSizeSlider.value)
        };

        this.columnsValue.textContent = layout.columns;
        this.spacingValue.textContent = layout.spacing;
        this.iconSizeValue.textContent = layout.iconSize;

        this.model.updateLayout(layout);
        this.renderNavigationGrid();
    }

    // 导航管理
    renderNavList() {
        this.navList.innerHTML = '';
        const items = this.model.getNavigationItems();

        items.forEach(item => {
            const listItem = document.createElement('div');
            listItem.className = 'nav-list-item';
            listItem.innerHTML = `
                <div class="nav-item-info">
                    <strong class="nav-item-name">${item.name}</strong>
                </div>
                <div class="nav-item-actions">
                    <button class="btn secondary edit-item" data-id="${item.id}">编辑</button>
                    <button class="btn danger delete-item" data-id="${item.id}">删除</button>
                </div>
            `;

            listItem.querySelector('.edit-item').addEventListener('click', () => this.openEditExistingModal(item.id));

            listItem.querySelector('.delete-item').addEventListener('click', () => {
                // 打开自定义确认删除模态框
                this.openConfirmDeleteModal(`确定要删除 "${item.name}" 吗？`, () => {
                    this.model.deleteNavigationItem(item.id);
                    this.renderNavigationGrid();
                    this.renderNavList();
                    this.showToast('已删除导航项');
                });
            });

            this.navList.appendChild(listItem);
        });
    }

    // 右键菜单
    showContextMenu(event, menuElement) {
        event.preventDefault();
        this.hideAllMenus();

        menuElement.style.display = 'block';
        menuElement.style.left = `${event.pageX}px`;
        menuElement.style.top = `${event.pageY}px`;

        // 绑定菜单项事件
        const menuItems = menuElement.querySelectorAll('li');
        menuItems.forEach(item => {
            item.addEventListener('click', () => this.handleContextMenuAction(item.dataset.action));
        });

        this.currentContextMenu = menuElement;
    }

    hideAllMenus() {
        // 隐藏所有右键菜单
        [this.iconContextMenu, this.wallpaperContextMenu, this.toolgroupContextMenu].forEach(menu => {
            if (menu) menu.style.display = 'none';
        });
        this.currentContextMenu = null;

        // 隐藏工具组面板和模态框
        this.toolgroupPanel.classList.remove('active');
        this.toolgroupSelectModal.classList.remove('active');
        this.toolgroupEditModal.classList.remove('active');
    }

    handleContextMenuAction(action) {
        this.hideAllMenus();

        switch (action) {
            case 'edit':
                if (this.currentEditItemId) {
                    this.openEditExistingModal(this.currentEditItemId);
                }
                break;
            case 'delete':
                if (this.currentEditItemId) {
                    if (confirm('确定要删除这个导航项吗？')) {
                        this.model.deleteNavigationItem(this.currentEditItemId);
                        this.renderNavigationGrid();
                        this.renderNavList();
                        this.showToast('已删除导航项');
                    }
                }
                break;
            case 'move-up':
                if (this.currentEditItemId) {
                    this.model.moveNavigationItem(this.currentEditItemId, 'up');
                    this.renderNavigationGrid();
                    this.renderNavList();
                }
                break;
            case 'move-down':
                if (this.currentEditItemId) {
                    this.model.moveNavigationItem(this.currentEditItemId, 'down');
                    this.renderNavigationGrid();
                    this.renderNavList();
                }
                break;
            case 'add-to-tool-group':
                if (this.currentEditItemId) {
                    this.openToolgroupSelectModal();
                }
                break;
            case 'edit-toolgroup':
                if (this.currentEditItemId) {
                    this.openToolgroupEditModal(this.currentEditItemId);
                }
                break;
            case 'add-item':
                if (this.currentEditItemId) {
                    // 这里可以添加向工具组添加项的逻辑
                    this.showToast('添加项功能开发中');
                }
                break;
            case 'remove-item':
                if (this.currentEditItemId) {
                    // 这里可以添加从工具组移除项的逻辑
                    this.showToast('删除项功能开发中');
                }
                break;
            case 'delete-toolgroup':
                if (this.currentEditItemId) {
                    const group = this.model.getToolGroups().find(g => g.id === this.currentEditItemId);
                    if (group) {
                        // 打开自定义确认删除模态框
                        this.openConfirmDeleteModal(`确定要删除工具组 "${group.name}" 吗？`, () => {
                            this.model.deleteToolGroup(this.currentEditItemId);
                            this.renderNavigationGrid();
                            this.renderToolgroupList();
                            this.showToast('已删除工具组');
                        });
                    }
                }
                break;
            case 'set-wallpaper':
                this.wallpaperUpload.click();
                break;
            case 'add-custom-url':
                this.openEditModal();
                break;
            case 'nav-settings':
            case 'open-settings':
                this.openSettingsPanel();
                break;
        }
    }

    // 设置面板
    toggleSettingsPanel() {
        this.settingsPanel.classList.toggle('active');
    }

    openSettingsPanel() {
        this.settingsPanel.classList.add('active');
    }

    closeSettingsPanel() {
        this.settingsPanel.classList.remove('active');
    }

    // 编辑模态框
    openEditModal(itemId = null) {
        this.currentEditItemId = itemId;
        this.editModal.classList.add('active');
        
        // 重置手动选择图标状态
        this.manualIconSelected.new = false;

        if (itemId) {
            const item = this.model.getNavigationItems().find(i => i.id === itemId);
            if (item) {
                this.editName.value = item.name;
                this.editUrl.value = item.url;
                this.iconPreview.style.backgroundImage = '';
                this.iconPreview.textContent = item.icon || '';
            }
        } else {
            this.editName.value = '';
            this.editUrl.value = '';
            this.iconPreview.style.backgroundImage = '';
            this.iconPreview.innerHTML = '<div class="icon-loading" style="display: none;">获取中...</div>';
        }
    }

    closeEditModal() {
        this.editModal.classList.remove('active');
        this.currentEditItemId = null;
        this.editForm.reset();
    }

    handleEditSubmit(event) {
        event.preventDefault();

        const name = this.editName.value.trim();
        let url = this.editUrl.value.trim();

        if (!name || !url) {
            this.showToast('请填写名称和网址', 'error');
            return;
        }

        // 验证和规范化URL
        const validationResult = this.validateAndNormalizeUrl(url);
        if (!validationResult.valid) {
            this.showToast(validationResult.message, 'error');
            return;
        }
        
        const normalizedUrl = validationResult.url;
        const itemData = { name, url: normalizedUrl };
        
        // 获取图标URL
        const iconStyle = this.iconPreview.style.backgroundImage;
        if (iconStyle) {
            // 提取URL
            const iconUrl = iconStyle.match(/url\(['"]?([^'"]+)['"]?\)/)[1];
            itemData.icon = iconUrl;
        } else {
            // 如果没有背景图片，使用文本内容作为图标
            const iconText = this.iconPreview.textContent.trim();
            if (iconText) {
                itemData.icon = iconText;
            }
        }

        if (this.currentEditItemId) {
            // 更新现有项
            this.model.updateNavigationItem(this.currentEditItemId, itemData);
            this.showToast('导航项已更新');
        } else {
            // 添加新项
            this.model.addNavigationItem(itemData);
            this.showToast('导航项已添加');
        }

        this.renderNavigationGrid();
        this.renderNavList();
        this.closeEditModal();
    }

    handleSaveAndContinue() {
        const name = this.editName.value.trim();
        let url = this.editUrl.value.trim();

        if (!name || !url) {
            this.showToast('请填写名称和网址', 'error');
            return;
        }

        // 验证和规范化URL
        const validationResult = this.validateAndNormalizeUrl(url);
        if (!validationResult.valid) {
            this.showToast(validationResult.message, 'error');
            return;
        }
        
        const normalizedUrl = validationResult.url;
        const itemData = { name, url: normalizedUrl };
        
        // 获取图标URL
        const iconStyle = this.iconPreview.style.backgroundImage;
        if (iconStyle) {
            // 提取URL
            const iconUrl = iconStyle.match(/url\(['"]?([^'"]+)['"]?\)/)[1];
            itemData.icon = iconUrl;
        } else {
            // 如果没有背景图片，使用文本内容作为图标
            const iconText = this.iconPreview.textContent.trim();
            if (iconText) {
                itemData.icon = iconText;
            }
        }

        if (this.currentEditItemId) {
            this.model.updateNavigationItem(this.currentEditItemId, itemData);
            this.showToast('导航项已更新');
        } else {
            this.model.addNavigationItem(itemData);
            this.showToast('导航项已添加');
        }

        this.renderNavigationGrid();
        this.renderNavList();

        this.editName.value = '';
        this.editUrl.value = '';
        this.iconPreview.style.backgroundImage = '';
        this.iconPreview.textContent = '';
        this.editIcon.value = '';

        this.currentEditItemId = null;
    }

    // 编辑现有导航项模态框方法
    openEditExistingModal(itemId) {
        this.currentEditItemId = itemId;
        this.editExistingModal.classList.add('active');
        
        // 重置手动选择图标状态
        this.manualIconSelected.existing = false;

        const item = this.model.getNavigationItems().find(i => i.id === itemId);
        if (item) {
            this.editExistingName.value = item.name;
            this.editExistingUrl.value = item.url;
            
            // 根据图标类型设置预览
            if (item.icon) {
                if (item.icon.startsWith('http') || item.icon.startsWith('data:image')) {
                    // 如果是URL，设置为背景图片
                    this.iconExistingPreview.style.backgroundImage = `url(${item.icon})`;
                    this.iconExistingPreview.style.backgroundSize = 'cover';
                    this.iconExistingPreview.style.backgroundRepeat = 'no-repeat';
                    this.iconExistingPreview.style.backgroundPosition = 'center';
                    this.iconExistingPreview.textContent = '';
                } else {
                    // 否则作为文本显示
                    this.iconExistingPreview.style.backgroundImage = '';
                    this.iconExistingPreview.textContent = item.icon;
                }
            } else {
                // 默认状态
                this.iconExistingPreview.style.backgroundImage = '';
                this.iconExistingPreview.innerHTML = '<div class="icon-loading" style="display: none;">获取中...</div>';
            }
        }
    }

    closeEditExistingModal() {
        this.editExistingModal.classList.remove('active');
        this.currentEditItemId = null;
        this.editExistingForm.reset();
    }

    handleEditExistingSubmit(event) {
        event.preventDefault();

        const name = this.editExistingName.value.trim();
        let url = this.editExistingUrl.value.trim();

        if (!name || !url) {
            this.showToast('请填写名称和网址', 'error');
            return;
        }

        // 验证和规范化URL
        const validationResult = this.validateAndNormalizeUrl(url);
        if (!validationResult.valid) {
            this.showToast(validationResult.message, 'error');
            return;
        }
        
        const normalizedUrl = validationResult.url;
        const itemData = { name, url: normalizedUrl };
        
        // 获取图标URL
        const iconStyle = this.iconExistingPreview.style.backgroundImage;
        if (iconStyle) {
            // 提取URL
            const iconUrl = iconStyle.match(/url\(['"]?([^'"]+)['"]?\)/)[1];
            itemData.icon = iconUrl;
        } else {
            // 如果没有背景图片，使用文本内容作为图标
            const iconText = this.iconExistingPreview.textContent.trim();
            if (iconText) {
                itemData.icon = iconText;
            }
        }

        if (this.currentEditItemId) {
            this.model.updateNavigationItem(this.currentEditItemId, itemData);
            this.showToast('导航项已更新');
        }

        this.renderNavigationGrid();
        this.renderNavList();
        this.closeEditExistingModal();
    }

    previewExistingIcon(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('请选择图片文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.iconExistingPreview.style.backgroundImage = `url(${e.target.result})`;
            this.iconExistingPreview.textContent = '';
        };
        reader.readAsDataURL(file);
    }

    previewIcon(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('请选择图片文件', 'error');
            return;
        }

        // 标记为手动选择图标
        this.manualIconSelected.new = true;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.iconPreview.style.backgroundImage = `url(${e.target.result})`;
            this.iconPreview.textContent = '';
        };
        reader.readAsDataURL(file);
    }

    // 预览现有导航项图标
    previewExistingIcon(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('请选择图片文件', 'error');
            return;
        }

        // 标记为手动选择图标
        this.manualIconSelected.existing = true;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.iconExistingPreview.style.backgroundImage = `url(${e.target.result})`;
            this.iconExistingPreview.textContent = '';
        };
        reader.readAsDataURL(file);
    }

    // 自动获取图标
    async autoGetFavicon(urlInput, previewElement) {
        let url = urlInput.value.trim();
        if (!url) return;

        // 验证和规范化URL
        const validationResult = this.validateAndNormalizeUrl(url);
        if (!validationResult.valid) {
            return;
        }

        const normalizedUrl = validationResult.url;

        // 检查是否已手动选择图标
        const isNewItem = previewElement === this.iconPreview;
        if (isNewItem ? this.manualIconSelected.new : this.manualIconSelected.existing) {
            return;
        }

        // 显示加载状态
        this.updateIconPreview(previewElement, null, true);

        try {
            const iconUrl = await this.getFavicon(normalizedUrl);
            if (iconUrl) {
                this.updateIconPreview(previewElement, iconUrl, false);
            } else {
                this.updateIconPreview(previewElement, null, false);
                this.showToast('未找到可用图标，请手动选择', 'error');
            }
        } catch (error) {
            this.updateIconPreview(previewElement, null, false);
            this.showToast('获取图标失败，请手动选择', 'error');
        }
    }

    // 获取图标
    async getFavicon(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const cacheKey = `favicon_${domain}`;

            // 检查缓存
            const cachedIcon = this.getCachedFavicon(cacheKey);
            if (cachedIcon) {
                return cachedIcon;
            }

            // 定义Favicon服务列表
            const faviconServices = [
                `https://icons.duckduckgo.com/ip3/${domain}.ico`,
                `https://favicon.yandex.net/favicon/${domain}`,
                `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
            ];

            // 1. 尝试使用各个Favicon服务
            for (const serviceUrl of faviconServices) {
                try {
                    const response = await this.fetchWithTimeout(serviceUrl, 3000);
                    if (response.ok) {
                        this.cacheFavicon(cacheKey, serviceUrl);
                        return serviceUrl;
                    }
                } catch (error) {
                    console.log(`Favicon服务 ${serviceUrl} 请求失败:`, error.message);
                    // 继续尝试下一个服务
                    continue;
                }
            }

            // 2. 尝试直接获取favicon.ico
            try {
                const faviconUrl = `${urlObj.protocol}//${domain}/favicon.ico`;
                const faviconResponse = await this.fetchWithTimeout(faviconUrl, 3000);
                
                if (faviconResponse.ok) {
                    this.cacheFavicon(cacheKey, faviconUrl);
                    return faviconUrl;
                }
            } catch (error) {
                console.log(`直接获取favicon.ico失败:`, error.message);
            }

            // 3. 尝试从HTML页面提取图标
            try {
                const htmlIconUrl = await this.extractIconFromHtml(url);
                if (htmlIconUrl) {
                    this.cacheFavicon(cacheKey, htmlIconUrl);
                    return htmlIconUrl;
                }
            } catch (error) {
                console.log(`从HTML提取图标失败:`, error.message);
            }

            return null;
        } catch (error) {
            console.error('获取图标失败:', error);
            return null;
        }
    }

    // 带超时的fetch请求
    fetchWithTimeout(url, timeout) {
        return Promise.race([
            fetch(url, {
                mode: 'cors',
                cache: 'force-cache',
                headers: {
                    'Accept': 'text/html, */*'
                }
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('请求超时')), timeout)
            )
        ]);
    }

    // 从HTML页面提取图标
    async extractIconFromHtml(url) {
        try {
            const response = await this.fetchWithTimeout(url, 5000);
            if (!response.ok) {
                return null;
            }

            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const urlObj = new URL(url);

            // 查找所有图标标签
            const iconTags = doc.querySelectorAll('link[rel*="icon"]');
            if (iconTags.length === 0) {
                return null;
            }

            // 优先选择带有sizes属性的较大图标
            let bestIcon = null;
            let maxSize = 0;

            iconTags.forEach(tag => {
                const href = tag.getAttribute('href');
                if (!href) return;

                // 解析图标URL
                let iconUrl;
                try {
                    iconUrl = new URL(href, url).href;
                } catch {
                    return;
                }

                // 检查图标大小
                const sizes = tag.getAttribute('sizes');
                if (sizes) {
                    const sizeMatch = sizes.match(/(\d+)x?(\d+)?/);
                    if (sizeMatch) {
                        const size = parseInt(sizeMatch[1]);
                        if (size > maxSize) {
                            maxSize = size;
                            bestIcon = iconUrl;
                        }
                    }
                } else if (!bestIcon) {
                    // 如果没有sizes属性，使用第一个找到的图标
                    bestIcon = iconUrl;
                }
            });

            return bestIcon;
        } catch (error) {
            console.error('从HTML提取图标失败:', error);
            return null;
        }
    }

    // 更新图标预览
    updateIconPreview(previewElement, iconUrl, isLoading) {
        // 确保previewElement存在
        if (!previewElement) {
            return;
        }
        
        let loadingElement = previewElement.querySelector('.icon-loading');
        
        // 如果没有loadingElement，创建一个
        if (!loadingElement) {
            loadingElement = document.createElement('div');
            loadingElement.className = 'icon-loading';
            loadingElement.style.display = 'none';
            loadingElement.textContent = '获取中...';
            previewElement.appendChild(loadingElement);
        }
        
        if (isLoading) {
            loadingElement.style.display = 'flex';
            previewElement.style.backgroundImage = '';
            previewElement.style.backgroundSize = '';
            previewElement.style.backgroundRepeat = '';
            previewElement.style.backgroundPosition = '';
        } else {
            loadingElement.style.display = 'none';
            if (iconUrl) {
                previewElement.style.backgroundImage = `url(${iconUrl})`;
                previewElement.style.backgroundSize = 'cover';
                previewElement.style.backgroundRepeat = 'no-repeat';
                previewElement.style.backgroundPosition = 'center';
                previewElement.textContent = '';
            } else {
                previewElement.style.backgroundImage = '';
                previewElement.style.backgroundSize = '';
                previewElement.style.backgroundRepeat = '';
                previewElement.style.backgroundPosition = '';
            }
        }
    }

    // 缓存图标
    cacheFavicon(key, iconUrl) {
        const cacheData = {
            iconUrl,
            timestamp: Date.now(),
            expire: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天有效期
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    }

    // 获取缓存的图标
    getCachedFavicon(key) {
        const cachedData = localStorage.getItem(key);
        if (!cachedData) return null;

        try {
            const { iconUrl, expire } = JSON.parse(cachedData);
            if (Date.now() <= expire) {
                return iconUrl;
            }
            // 缓存过期，删除
            localStorage.removeItem(key);
            return null;
        } catch (error) {
            console.error('解析缓存失败:', error);
            localStorage.removeItem(key);
            return null;
        }
    }

    // URL验证和规范化工具函数
    validateAndNormalizeUrl(url) {
        // 去除首尾空格
        url = url.trim();
        if (!url) {
            return { valid: false, message: '网址不能为空' };
        }

        // 检查是否包含无效协议
        const protocolRegex = /^[a-zA-Z][a-zA-Z0-9+-.]*:\/\//;
        const protocolMatch = url.match(protocolRegex);
        if (protocolMatch) {
            const protocol = protocolMatch[0].toLowerCase();
            // 只允许http://和https://协议
            if (protocol !== 'http://' && protocol !== 'https://') {
                return { valid: false, message: '网址格式无效: 只支持http://和https://协议' };
            }
        }

        // 规范化处理
        // 1. 对于www.开头的网址，添加https://协议
        if (url.startsWith('www.')) {
            url = `https://${url}`;
        }
        // 2. 对于其他没有协议的网址，尝试添加https://
        else if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }

        // 验证URL格式
        try {
            const urlObj = new URL(url);
            
            // 验证主机名是否有效
            if (!urlObj.hostname || urlObj.hostname === '') {
                return { valid: false, message: '网址格式无效，请检查主机名' };
            }
            
            // 验证主机名格式（至少包含一个点，且不以点开头或结尾）
            const hostname = urlObj.hostname;
            if (hostname.indexOf('.') === -1 && hostname !== 'localhost') {
                return { valid: false, message: '网址格式无效，请检查主机名后缀' };
            }
            
            if (hostname.startsWith('.') || hostname.endsWith('.')) {
                return { valid: false, message: '网址格式无效，主机名不能以点开头或结尾' };
            }
            
            // 检查是否包含连续的点
            if (hostname.includes('..')) {
                return { valid: false, message: '网址格式无效，主机名不能包含连续的点' };
            }
            
            return { valid: true, url: urlObj.toString() };
        } catch (error) {
            return { valid: false, message: `网址格式无效: ${error.message}` };
        }
    }

    // 数据管理
    exportSettings() {
        // 优先使用File System API
        if (this.model.isFileSystemAPISupported()) {
            this.model.exportSettingsWithFileSystem().then(success => {
                if (success) {
                    this.showToast('设置已导出到本地文件');
                } else {
                    // 降级使用传统下载方式
                    this.exportSettingsWithDownload();
                }
            }).catch(err => {
                console.error('File System API导出失败，使用传统方式:', err);
                this.exportSettingsWithDownload();
            });
        } else {
            // 浏览器不支持File System API，使用传统下载方式
            this.exportSettingsWithDownload();
        }
    }
    
    // 使用传统下载方式导出设置
    exportSettingsWithDownload() {
        const downloadUrl = this.model.exportSettings();
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `nav-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
        this.showToast('设置已导出');
    }

    handleImportFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.processImportData(e.target.result);
        };
        reader.readAsText(file);
        event.target.value = '';
    }
    
    // 处理导入的数据
    processImportData(jsonData) {
        const success = this.model.importSettings(jsonData);
        if (success) {
            this.refreshAllData();
            this.showToast('设置已导入');
        } else {
            this.showToast('导入失败，请检查文件格式', 'error');
        }
    }
    
    // 刷新所有数据和UI
    refreshAllData() {
        this.renderNavigationGrid();
        this.updateWallpaper();
        this.updateLayoutControls();
        this.renderNavList();
        this.renderToolgroupList();
    }
    
    // 文件存储控制方法
    toggleFileStorage(enabled) {
        if (enabled) {
            if (this.model.isFirefox() || this.model.isTreaBrowser()) {
                // 对于Firefox和trea浏览器，直接启用，使用兼容模式
                this.model.initFileStorage().then(success => {
                    if (success) {
                        this.model.isFileStorageEnabled = true;
                        this.showToast('文件存储已启用（使用浏览器兼容模式）');
                    } else {
                        this.enableFileStorageCheckbox.checked = false;
                        this.showToast('文件存储初始化失败，请重试', 'error');
                    }
                }).catch(err => {
                    this.enableFileStorageCheckbox.checked = false;
                    this.showToast('文件存储初始化失败：' + err.message, 'error');
                });
            } else if (this.model.isFileSystemAPISupported()) {
                // 原有逻辑，适用于Chrome/Edge/Opera
                this.model.initFileStorage().then(success => {
                    if (success) {
                        this.model.isFileStorageEnabled = true;
                        this.showToast('文件存储已启用');
                    } else {
                        this.enableFileStorageCheckbox.checked = false;
                        this.showToast('文件存储初始化失败，请重试', 'error');
                    }
                }).catch(err => {
                    this.enableFileStorageCheckbox.checked = false;
                    this.showToast('文件存储初始化失败：' + err.message, 'error');
                });
            } else {
                this.enableFileStorageCheckbox.checked = false;
                this.showToast('您的浏览器不支持文件系统访问API。目前仅Chrome、Edge和Opera浏览器支持此功能。', 'error');
            }
        } else {
            this.model.isFileStorageEnabled = false;
            this.showToast('文件存储已禁用');
        }
    }
    
    selectStorageFile() {
        if (this.model.isFileStorageEnabled || this.model.isFirefox() || this.model.isTreaBrowser()) {
            // 对于已启用文件存储或Firefox/trea浏览器，使用适配器打开存储
            if (!this.model.storageAdapter) {
                this.model.initFileStorage();
            }
            
            this.model.storageAdapter.openStorage().then(success => {
                if (success) {
                    this.model.isFileStorageEnabled = true;
                    this.enableFileStorageCheckbox.checked = true;
                    this.showToast('已选择存储文件');
                    this.refreshAllData();
                } else {
                    this.showToast('选择存储文件失败', 'error');
                }
            }).catch(err => {
                this.showToast('选择存储文件失败：' + err.message, 'error');
            });
        } else if (this.model.isFileSystemAPISupported()) {
            // 原有逻辑，适用于Chrome/Edge/Opera
            this.model.openStorageFile().then(success => {
                if (success) {
                    this.model.isFileStorageEnabled = true;
                    this.enableFileStorageCheckbox.checked = true;
                    this.showToast('已选择存储文件');
                    // 重新加载数据
                    this.model.loadFromFile().then(success => {
                        if (success) {
                            this.refreshAllData();
                        }
                    });
                }
            }).catch(err => {
                this.showToast('选择存储文件失败：' + err.message, 'error');
            });
        } else {
            this.showToast('您的浏览器不支持文件系统访问API。目前仅Chrome、Edge和Opera浏览器支持此功能。', 'error');
        }
    }

    performManualBackup() {
        if (this.model.isFileStorageEnabled || this.model.isFirefox() || this.model.isTreaBrowser()) {
            // 对于已启用文件存储或Firefox/trea浏览器，使用适配器备份
            if (!this.model.storageAdapter) {
                this.model.initFileStorage();
            }
            
            this.model.storageAdapter.backupStorage().then(success => {
                if (success) {
                    this.showToast('手动备份成功');
                } else {
                    this.showToast('手动备份失败', 'error');
                }
            }).catch(err => {
                this.showToast('手动备份失败：' + err.message, 'error');
            });
        } else {
            this.showToast('请先启用文件存储', 'error');
        }
    }

    restoreFromManualBackup() {
        if (this.model.isFileStorageEnabled || this.model.isFirefox() || this.model.isTreaBrowser()) {
            // 对于已启用文件存储或Firefox/trea浏览器，使用适配器恢复
            if (!this.model.storageAdapter) {
                this.model.initFileStorage();
            }
            
            this.model.storageAdapter.restoreStorage().then(success => {
                if (success) {
                    this.refreshAllData();
                    this.showToast('从备份恢复成功');
                } else {
                    this.showToast('从备份恢复失败', 'error');
                }
            }).catch(err => {
                this.showToast('从备份恢复失败：' + err.message, 'error');
            });
        } else if (this.model.isFileSystemAPISupported()) {
            // 原有逻辑，适用于Chrome/Edge/Opera
            this.model.restoreFromBackup().then(success => {
                if (success) {
                    this.refreshAllData();
                    this.showToast('从备份恢复成功');
                } else {
                    this.showToast('从备份恢复失败', 'error');
                }
            }).catch(err => {
                this.showToast('从备份恢复失败：' + err.message, 'error');
            });
        } else {
            this.showToast('您的浏览器不支持文件系统访问API。目前仅Chrome、Edge和Opera浏览器支持此功能。', 'error');
        }
    }

    resetSettings() {
        if (confirm('确定要重置所有设置吗？这将删除所有自定义设置。')) {
            this.model.resetToDefault();
            this.renderNavigationGrid();
            this.updateWallpaper();
            this.updateLayoutControls();
            this.renderNavList();
            this.showToast('已恢复默认设置');
        }
    }

    // 工具组相关方法
    // 打开工具组展开面板
    openToolgroupPanel(groupId) {
        const group = this.model.getToolGroups().find(g => g.id === groupId);
        if (!group) return;

        this.toolgroupPanelTitle.textContent = group.name;
        this.renderToolgroupItems(group);
        this.toolgroupPanel.classList.add('active');
    }

    // 关闭工具组展开面板
    closeToolgroupPanel() {
        this.toolgroupPanel.classList.remove('active');
    }

    // 渲染工具组内的子项
    renderToolgroupItems(group) {
        this.toolgroupItems.innerHTML = '';
        const layout = this.model.getLayout();

        if (group.items.length === 0) {
            this.toolgroupItems.innerHTML = '<p style="text-align: center; color: #718096; padding: 2rem;">工具组内暂无项</p>';
            return;
        }

        // 限制最多显示15项（3行 × 5列）
        const maxItems = 15;
        const displayItems = group.items.slice(0, maxItems);

        displayItems.forEach(item => {
            const navItem = document.createElement('a');
            navItem.href = item.url;
            navItem.target = '_blank';
            navItem.className = 'nav-item';
            navItem.style.setProperty('--icon-size', '48px');

            navItem.innerHTML = `
                <div class="nav-item-icon" style="width: 48px; height: 48px; font-size: 28.8px">
                    ${item.icon || '🔗'}
                </div>
                <div class="nav-item-name">${item.name}</div>
            `;

            this.toolgroupItems.appendChild(navItem);
        });
    }

    // 合并两个导航项为一个工作组
    mergeItemsIntoToolGroup(itemId1, itemId2) {
        // 获取两个导航项
        const item1 = this.model.getNavigationItems().find(i => i.id === itemId1);
        const item2 = this.model.getNavigationItems().find(i => i.id === itemId2);

        if (!item1 || !item2) {
            this.showToast('找不到导航项', 'error');
            return;
        }

        // 创建新工作组
        const newGroupName = `${item1.name} + ${item2.name}`;
        const newGroup = this.model.addToolGroup({ name: newGroupName });

        // 添加两个项到工作组
        this.model.addItemToToolGroup(newGroup.id, {...item1});
        this.model.addItemToToolGroup(newGroup.id, {...item2});

        // 删除原导航项
        const deleteResult1 = this.model.deleteNavigationItem(itemId1);
        const deleteResult2 = this.model.deleteNavigationItem(itemId2);

        // 确保删除成功后再重新渲染
        if (deleteResult1 && deleteResult2) {
            // 重新渲染所有相关列表，确保完全刷新界面
            this.renderNavList();
            this.renderToolgroupList();
            this.renderNavigationGrid();
            this.showToast('已合并为工具组');
        } else {
            // 如果删除失败，回滚创建的工具组
            this.model.deleteToolGroup(newGroup.id);
            this.showToast('合并失败，请重试', 'error');
        }
    }

    // 渲染工具组列表（设置面板中）
    renderToolgroupList() {
        this.toolgroupList.innerHTML = '';
        const toolGroups = this.model.getToolGroups();

        if (toolGroups.length === 0) {
            this.toolgroupList.innerHTML = '<p style="color: #718096; font-size: 0.9em; text-align: center; padding: 1rem;">暂无工具组</p>';
            return;
        }

        toolGroups.forEach(group => {
            const listItem = document.createElement('div');
            listItem.className = 'nav-list-item';
            listItem.innerHTML = `
                <div class="nav-item-info">
                    <strong class="nav-item-name">${group.name}</strong>
                    <div class="nav-item-count">${group.items.length} 项</div>
                </div>
                <div class="nav-item-actions">
                    <button class="btn secondary edit-toolgroup" data-id="${group.id}">编辑</button>
                    <button class="btn danger delete-toolgroup" data-id="${group.id}">删除</button>
                </div>
            `;

            listItem.querySelector('.edit-toolgroup').addEventListener('click', () => {
                this.openToolgroupEditModal(group.id);
            });

            listItem.querySelector('.delete-toolgroup').addEventListener('click', () => {
                // 打开自定义确认删除模态框
                this.openConfirmDeleteModal(`确定要删除工具组 "${group.name}" 吗？`, () => {
                    // 仅在用户确认后执行删除操作
                    this.model.deleteToolGroup(group.id);
                    // 刷新相关列表
                    this.renderNavigationGrid();
                    this.renderToolgroupList();
                    this.showToast('已删除工具组');
                });
            });

            this.toolgroupList.appendChild(listItem);
        });
    }

    // 打开工具组选择模态框
    openToolgroupSelectModal() {
        this.renderToolgroupSelectList();
        this.toolgroupSelectModal.classList.add('active');
    }

    // 渲染工具组选择列表
    renderToolgroupSelectList() {
        this.toolgroupSelectList.innerHTML = '';
        const toolGroups = this.model.getToolGroups();

        if (toolGroups.length === 0) {
            this.toolgroupSelectList.innerHTML = '<p style="color: #718096; font-size: 0.9em; margin-bottom: 1rem;">暂无工具组</p>';
            return;
        }

        toolGroups.forEach(group => {
            const option = document.createElement('div');
            option.className = 'form-group';
            option.innerHTML = `
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                    <input type="radio" name="toolgroup" value="${group.id}"> ${group.name} (${group.items.length}项)
                </label>
            `;
            this.toolgroupSelectList.appendChild(option);
        });
    }

    // 打开工具组编辑模态框
    openToolgroupEditModal(groupId = null) {
        this.currentEditItemId = groupId;
        this.toolgroupEditModal.classList.add('active');

        if (groupId) {
            const group = this.model.getToolGroups().find(g => g.id === groupId);
            if (group) {
                this.toolgroupEditTitle.textContent = '编辑工具组';
                this.toolgroupNameInput.value = group.name;
            }
        } else {
            this.toolgroupEditTitle.textContent = '创建工具组';
            this.toolgroupNameInput.value = '';
        }
    }

    // 关闭工具组编辑模态框
    closeToolgroupEditModal() {
        this.toolgroupEditModal.classList.remove('active');
        this.currentEditItemId = null;
        this.toolgroupEditForm.reset();
    }
    
    // 打开确认删除模态框
    openConfirmDeleteModal(message, callback) {
        this.confirmDeleteMessage.textContent = message;
        this.confirmDeleteCallback = callback;
        this.confirmDeleteModal.classList.add('active');
    }
    
    // 执行确认删除操作
    confirmDeleteAction() {
        if (typeof this.confirmDeleteCallback === 'function') {
            this.confirmDeleteCallback();
        }
        this.confirmDeleteModal.classList.remove('active');
        this.confirmDeleteCallback = null;
    }

    // 搜索相关方法
    initSearchSettings() {
        const searchSettings = this.model.getSearchSettings();
        // 设置默认搜索引擎
        this.searchEngineSelect.value = searchSettings.engine;
        // 设置搜索框透明度
        this.updateSearchOpacity(searchSettings.opacity);
    }

    handleSearchEngineChange(engine) {
        this.model.setSearchEngine(engine);
    }

    handleSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        const engine = this.model.getSearchEngine();
        const searchUrls = {
            google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            baidu: `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
            bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
            yahoo: `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`
        };

        window.open(searchUrls[engine], '_blank');
    }

    updateSearchOpacity(opacity) {
        // 更新搜索组件背景透明度 - 移除背景色
        if (this.searchComponent) {
            this.searchComponent.style.background = 'transparent';
        }
        
        // 更新搜索引擎选择框透明度 - 设置为黑色
        if (this.searchEngineSelect) {
            this.searchEngineSelect.style.background = `rgba(0, 0, 0, ${opacity * 0.9})`;
        }
        
        // 更新搜索输入框透明度
        if (this.searchInput) {
            this.searchInput.style.background = `rgba(255, 255, 255, ${opacity * 0.9})`;
        }
    }

    updateSearchOpacitySetting() {
        const opacityPercent = parseInt(this.searchOpacitySlider.value);
        const opacity = 1 - (opacityPercent / 100); // 反转透明度逻辑，使数值越大越透明
        this.searchOpacityValue.textContent = opacityPercent;
        this.model.setSearchOpacity(opacity);
        this.updateSearchOpacity(opacity);
    }

    // 工具函数
    showToast(message, type = 'success') {
        this.toast.textContent = message;
        this.toast.className = 'toast show';
        if (type === 'error') {
            this.toast.classList.add('error');
        } else {
            this.toast.classList.remove('error');
        }

        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new NavigationApp();
});