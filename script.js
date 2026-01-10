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

// 数据模型类：负责所有数据的存储、加载和操作
class NavigationModel {
    constructor() {
        this.storageKey = 'browser-nav-settings';
        this.defaultSettings = {
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
            layout: {
                columns: 5,
                spacing: 10,
                iconSize: 48
            }
        };
        this.currentSettings = this.loadSettings();
    }

    loadSettings() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('加载设置失败，使用默认设置', e);
                return this.defaultSettings;
            }
        }
        return this.defaultSettings;
    }

    saveSettings() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.currentSettings));
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
        return;
 false    }

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

    resetToDefault() {
        this.currentSettings = this.defaultSettings;
        this.saveSettings();
    }

    exportSettings() {
        const dataStr = JSON.stringify(this.currentSettings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        return URL.createObjectURL(dataBlob);
    }

    importSettings(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            this.currentSettings = imported;
            this.saveSettings();
            return true;
        } catch (e) {
            console.error('导入设置失败', e);
            return false;
        }
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
        this.hideAllMenus();
    }

    cacheElements() {
        // 主元素
        this.wallpaperElement = document.getElementById('wallpaper');
        this.navGrid = document.getElementById('nav-grid');
        this.settingsPanel = document.getElementById('settings-panel');
        this.settingsToggle = document.getElementById('settings-toggle');
        this.closeSettings = document.getElementById('close-settings');
        this.addNavBtn = document.getElementById('add-nav-btn');

        // 右键菜单
        this.iconContextMenu = document.getElementById('icon-context-menu');
        this.wallpaperContextMenu = document.getElementById('wallpaper-context-menu');

        // 设置面板元素
        this.wallpaperUpload = document.getElementById('wallpaper-upload');
        this.wallpaperPreview = document.getElementById('wallpaper-preview');
        this.resetWallpaperBtn = document.getElementById('reset-wallpaper');
        this.navList = document.getElementById('nav-list');
        this.addNavItemBtn = document.getElementById('add-nav-item');
        this.columnsSlider = document.getElementById('columns');
        this.columnsValue = document.getElementById('columns-value');
        this.spacingSlider = document.getElementById('spacing');
        this.spacingValue = document.getElementById('spacing-value');
        this.iconSizeSlider = document.getElementById('icon-size');
        this.iconSizeValue = document.getElementById('icon-size-value');
        this.exportDataBtn = document.getElementById('export-data');
        this.importDataBtn = document.getElementById('import-data');
        this.importFile = document.getElementById('import-file');
        this.resetDataBtn = document.getElementById('reset-data');

        // 编辑模态框
        this.editModal = document.getElementById('edit-modal');
        this.editForm = document.getElementById('edit-form');
        this.editName = document.getElementById('edit-name');
        this.editUrl = document.getElementById('edit-url');
        this.editIcon = document.getElementById('edit-icon');
        this.iconPreview = document.getElementById('icon-preview');
        this.closeModalBtns = document.querySelectorAll('.close-modal');

        // 消息提示
        this.toast = document.getElementById('toast');
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

        // 数据管理
        this.exportDataBtn.addEventListener('click', () => this.exportSettings());
        this.importDataBtn.addEventListener('click', () => this.importFile.click());
        this.importFile.addEventListener('change', (e) => this.handleImportFile(e));
        this.resetDataBtn.addEventListener('click', () => this.resetSettings());

        // 导航管理
        this.addNavItemBtn.addEventListener('click', () => this.openEditModal());
        this.addNavBtn.addEventListener('click', () => this.openEditModal());

        // 编辑模态框
        this.editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
        this.editIcon.addEventListener('change', (e) => this.previewIcon(e));
        this.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeEditModal());
        });

        // 全局点击关闭菜单
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu')) {
                this.hideAllMenus();
            }
        });

        // 键盘事件
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllMenus();
                this.closeEditModal();
                this.closeSettingsPanel();
            }
        });
    }

    // 导航网格渲染
    renderNavigationGrid() {
        this.navGrid.innerHTML = '';
        const items = this.model.getNavigationItems();
        const layout = this.model.getLayout();

        // 更新网格样式
        this.navGrid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${120 - (5 - layout.columns) * 10}px, 1fr))`;
        this.navGrid.style.gap = `${layout.spacing}px`;

        items.forEach(item => {
            const navItem = document.createElement('a');
            navItem.href = item.url;
            navItem.target = '_blank';
            navItem.className = 'nav-item';
            navItem.dataset.id = item.id;
            navItem.style.setProperty('--icon-size', `${layout.iconSize}px`);

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

            this.navGrid.appendChild(navItem);
        });
    }

    // 壁纸相关
    updateWallpaper() {
        const wallpaper = this.model.getWallpaper();
        if (wallpaper) {
            this.wallpaperElement.style.backgroundImage = `url(${wallpaper})`;
            if (this.wallpaperPreview) {
                this.wallpaperPreview.style.backgroundImage = `url(${wallpaper})`;
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
                <div>
                    <strong>${item.name}</strong>
                    <div style="font-size: 0.8em; color: #718096">${item.url}</div>
                </div>
                <div>
                    <button class="btn secondary edit-item" data-id="${item.id}">编辑</button>
                    <button class="btn danger delete-item" data-id="${item.id}">删除</button>
                </div>
            `;

            listItem.querySelector('.edit-item').addEventListener('click', () => this.openEditModal(item.id));

            listItem.querySelector('.delete-item').addEventListener('click', () => {
                if (confirm(`确定要删除 "${item.name}" 吗？`)) {
                    this.model.deleteNavigationItem(item.id);
                    this.renderNavigationGrid();
                    this.renderNavList();
                    this.showToast('已删除导航项');
                }
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
        [this.iconContextMenu, this.wallpaperContextMenu].forEach(menu => {
            if (menu) menu.style.display = 'none';
        });
        this.currentContextMenu = null;
    }

    handleContextMenuAction(action) {
        this.hideAllMenus();

        switch (action) {
            case 'edit':
                if (this.currentEditItemId) {
                    this.openEditModal(this.currentEditItemId);
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
;
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

        if (itemId) {
            const item = this.model.getNavigationItems().find(i => i.id === itemId);
            if (item) {
                this.editName.value = item.name;
                this.editUrl.value = item.url;
                this.iconPreview.style.backgroundImage = '';
                this.iconPreview.textContent = item.icon || '';
            }
        } else {
 this           .editName.value = '';
            this.editUrl.value = '';
            this.iconPreview.style.backgroundImage = '';
            this.iconPreview.textContent = '';
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
        const url = this.editUrl.value.trim();

        if (!name || !url) {
            this.showToast('请填写名称和网址', 'error');
            return;
        }

        // 验证URL格式
        try {
            new URL(url);
        } catch {
            this.showToast('请输入有效的网址', 'error');
            return;
        }

        const itemData = { name, url };

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

    previewIcon(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('请选择图片文件', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.iconPreview.style.backgroundImage = `url(${e.target.result})`;
            this.iconPreview.textContent = '';
        };
        reader.readAsDataURL(file);
    }

    // 数据管理
    exportSettings() {
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
            const success = this.model.importSettings(e.target.result);
            if (success) {
                this.renderNavigationGrid();
                this.updateWallpaper();
                this.updateLayoutControls();
                this.renderNavList();
                this.showToast('设置已导入');
            } else {
                this.showToast('导入失败，请检查文件格式', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
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