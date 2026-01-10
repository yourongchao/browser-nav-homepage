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
                { id: 1, name: 'Google', url: 'https://google.com', icon: '🔍', type: 'item' },
                { id: 2, name: 'GitHub', url: 'https://github.com', icon: '💻', type: 'item' },
                { id: 3, name: 'YouTube', url: 'https://youtube.com', icon: '▶️', type: 'item' },
                { id: 4, name: 'Gmail', url: 'https://mail.google.com', icon: '📧', type: 'item' },
                { id: 5, name: '百度', url: 'https://baidu.com', icon: '🌐', type: 'item' },
                { id: 6, name: '知乎', url: 'https://zhihu.com', icon: '📚', type: 'item' },
                { id: 7, name: 'CSDN', url: 'https://csdn.net', icon: '👨‍💻', type: 'item' },
                { id: 8, name: 'B站', url: 'https://bilibili.com', icon: '🎬', type: 'item' },
                { id: 9, name: '淘宝', url: 'https://taobao.com', icon: '🛒', type: 'item' },
                { id: 10, name: '微信', url: 'https://wx.qq.com', icon: '💬', type: 'item' },
                { id: 11, name: '搜索工具', icon: '🔎', type: 'group', children: [1, 5] }
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
        const newItem = { 
            id: newId, 
            type: item.type || 'item',
            ...item,
            ...(item.type === 'group' ? { children: item.children || [] } : {}) 
        };
        this.currentSettings.navigationItems.push(newItem);
        this.saveSettings();
        return newItem;
    }

    addToolGroup(name, icon = '📦', initialItems = []) {
        return this.addNavigationItem({
            name,
            icon,
            type: 'group',
            children: initialItems
        });
    }

    addItemToGroup(groupId, itemId) {
        const group = this.currentSettings.navigationItems.find(item => item.id === groupId && item.type === 'group');
        if (group && !group.children.includes(itemId)) {
            group.children.push(itemId);
            this.saveSettings();
            return true;
        }
        return false;
    }

    removeItemFromGroup(groupId, itemId) {
        const group = this.currentSettings.navigationItems.find(item => item.id === groupId && item.type === 'group');
        if (group) {
            const index = group.children.indexOf(itemId);
            if (index !== -1) {
                group.children.splice(index, 1);
                this.saveSettings();
                return true;
            }
        }
        return false;
    }

    updateNavigationItem(id, updates) {
        const index = this.currentSettings.navigationItems.findIndex(item => item.id === id);
        if (index !== -1) {
            const item = this.currentSettings.navigationItems[index];
            const updatedItem = { ...item, ...updates };
            
            // 确保工具组始终有children数组
            if (updatedItem.type === 'group' && !updatedItem.children) {
                updatedItem.children = [];
            }
            
            this.currentSettings.navigationItems[index] = updatedItem;
            this.saveSettings();
            return true;
        }
        return false;
    }

    deleteNavigationItem(id) {
        const index = this.currentSettings.navigationItems.findIndex(item => item.id === id);
        if (index !== -1) {
            // 从所有工具组中移除该项目
            this.currentSettings.navigationItems.forEach(item => {
                if (item.type === 'group' && item.children) {
                    const childIndex = item.children.indexOf(id);
                    if (childIndex !== -1) {
                        item.children.splice(childIndex, 1);
                    }
                }
            });
            
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
            if (item.type === 'group') {
                this.renderGroupItem(item, layout);
            } else {
                this.renderRegularItem(item, layout);
            }
        });
    }

    // 渲染普通导航项
    renderRegularItem(item, layout) {
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
    }

    // 渲染工具组项
    renderGroupItem(item, layout) {
        const groupContainer = document.createElement('div');
        groupContainer.className = 'nav-group-container';
        groupContainer.dataset.id = item.id;

        // 工具组标题项
        const groupItem = document.createElement('div');
        groupItem.className = 'nav-item nav-group-item';
        groupItem.dataset.id = item.id;
        groupItem.style.setProperty('--icon-size', `${layout.iconSize}px`);

        // 获取工具组的子项图标
        const childrenItems = this.model.getNavigationItems().filter(child => 
            item.children && item.children.includes(child.id)
        );

        let groupContent = `
            <div class="nav-item-icon" style="width: ${layout.iconSize}px; height: ${layout.iconSize}px; font-size: ${layout.iconSize * 0.6}px">
                ${item.icon || '📦'}
            </div>
            <div class="nav-item-name">${item.name}</div>
        `;

        // 如果有子项，添加子项图标缩略图
        if (childrenItems.length > 0) {
            groupContent += '<div class="nav-group-thumbnails">';
            childrenItems.slice(0, 4).forEach(child => {
                groupContent += `<span class="nav-group-thumbnail" title="${child.name}">${child.icon || '🔗'}</span>`;
            });
            if (childrenItems.length > 4) {
                groupContent += `<span class="nav-group-more">+${childrenItems.length - 4}</span>`;
            }
            groupContent += '</div>';
        }

        groupItem.innerHTML = groupContent;

        // 工具组点击事件 - 切换展开/折叠
        groupItem.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleGroupExpand(item.id, groupContainer, layout);
        });

        // 工具组右键菜单
        groupItem.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.currentEditItemId = item.id;
            this.showContextMenu(e, this.iconContextMenu);
        });

        groupContainer.appendChild(groupItem);
        this.navGrid.appendChild(groupContainer);
    }

    // 切换工具组展开/折叠状态
    toggleGroupExpand(groupId, groupContainer, layout) {
        const expandedSection = groupContainer.querySelector('.nav-group-expanded');
        
        if (expandedSection) {
            // 折叠状态
            expandedSection.remove();
        } else {
            // 展开状态
            this.renderGroupExpanded(groupId, groupContainer, layout);
        }
    }

    // 渲染展开的工具组
    renderGroupExpanded(groupId, groupContainer, layout) {
        const groupItem = this.model.getNavigationItems().find(item => item.id === groupId);
        if (!groupItem || !groupItem.children) return;

        const expandedSection = document.createElement('div');
        expandedSection.className = 'nav-group-expanded';
        expandedSection.dataset.groupId = groupId;

        // 获取所有子项
        const childrenItems = this.model.getNavigationItems().filter(child => 
            groupItem.children.includes(child.id)
        );

        childrenItems.forEach(child => {
            const childElement = document.createElement('a');
            childElement.href = child.url;
            childElement.target = '_blank';
            childElement.className = 'nav-item nav-group-child';
            childElement.dataset.id = child.id;
            childElement.dataset.parentId = groupId;
            childElement.style.setProperty('--icon-size', `${layout.iconSize * 0.8}px`);

            childElement.innerHTML = `
                <div class="nav-item-icon" style="width: ${layout.iconSize * 0.8}px; height: ${layout.iconSize * 0.8}px; font-size: ${layout.iconSize * 0.48}px">
                    ${child.icon || '🔗'}
                </div>
                <div class="nav-item-name">${child.name}</div>
            `;

            // 子项右键菜单
            childElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.currentEditItemId = child.id;
                this.showContextMenu(e, this.iconContextMenu);
            });

            expandedSection.appendChild(childElement);
        });

        groupContainer.appendChild(expandedSection);
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
            
            let itemContent;
            if (item.type === 'group') {
                // 工具组项
                const childCount = item.children ? item.children.length : 0;
                itemContent = `
                    <div>
                        <strong>${item.name}</strong>
                        <div style="font-size: 0.8em; color: #718096">
                            <span style="background: #4f46e5; color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7em; margin-right: 8px;">工具组</span>
                            包含 ${childCount} 个项
                        </div>
                    </div>
                    <div>
                        <button class="btn secondary edit-item" data-id="${item.id}">编辑</button>
                        <button class="btn danger delete-item" data-id="${item.id}">删除</button>
                    </div>
                `;
            } else {
                // 普通项
                itemContent = `
                    <div>
                        <strong>${item.name}</strong>
                        <div style="font-size: 0.8em; color: #718096">${item.url}</div>
                    </div>
                    <div>
                        <button class="btn secondary edit-item" data-id="${item.id}">编辑</button>
                        <button class="btn danger delete-item" data-id="${item.id}">删除</button>
                    </div>
                `;
            }
            
            listItem.innerHTML = itemContent;

            listItem.querySelector('.edit-item').addEventListener('click', () => {
                if (item.type === 'group') {
                    this.openEditGroupModal(item.id);
                } else {
                    this.openEditModal(item.id);
                }
            });

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

        // 如果是图标右键菜单，根据项类型显示不同菜单项
        if (menuElement.id === 'icon-context-menu') {
            this.adaptContextMenuForItemType();
        }

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

    // 根据项类型调整右键菜单
    adaptContextMenuForItemType() {
        const item = this.model.getNavigationItems().find(i => i.id === this.currentEditItemId);
        if (!item) return;

        const menu = this.iconContextMenu;
        const menuItems = menu.querySelectorAll('li');
        
        // 先隐藏所有菜单项
        menuItems.forEach(item => item.style.display = 'none');
        
        if (item.type === 'item') {
            // 普通项菜单
            menu.querySelector('[data-action="edit"]').style.display = 'block';
            menu.querySelector('[data-action="delete"]').style.display = 'block';
            menu.querySelector('[data-action="move-up"]').style.display = 'block';
            menu.querySelector('[data-action="move-down"]').style.display = 'block';
            
            // 添加"添加到工具组"选项
            let addToGroupItem = menu.querySelector('[data-action="add-to-group"]');
            if (!addToGroupItem) {
                addToGroupItem = document.createElement('li');
                addToGroupItem.dataset.action = 'add-to-group';
                addToGroupItem.textContent = '添加到工具组';
                menu.querySelector('ul').appendChild(addToGroupItem);
            }
            addToGroupItem.style.display = 'block';
        } else if (item.type === 'group') {
            // 工具组菜单
            
            // 添加"编辑工具组"选项
            let editGroupItem = menu.querySelector('[data-action="edit-group"]');
            if (!editGroupItem) {
                editGroupItem = document.createElement('li');
                editGroupItem.dataset.action = 'edit-group';
                editGroupItem.textContent = '编辑工具组';
                menu.querySelector('ul').appendChild(editGroupItem);
            }
            editGroupItem.style.display = 'block';
            
            // 添加"添加项到工具组"选项
            let addItemToGroupItem = menu.querySelector('[data-action="add-item-to-group"]');
            if (!addItemToGroupItem) {
                addItemToGroupItem = document.createElement('li');
                addItemToGroupItem.dataset.action = 'add-item-to-group';
                addItemToGroupItem.textContent = '添加项';
                menu.querySelector('ul').appendChild(addItemToGroupItem);
            }
            addItemToGroupItem.style.display = 'block';
            
            // 添加"删除工具组"选项
            let deleteGroupItem = menu.querySelector('[data-action="delete-group"]');
            if (!deleteGroupItem) {
                deleteGroupItem = document.createElement('li');
                deleteGroupItem.dataset.action = 'delete-group';
                deleteGroupItem.textContent = '删除工具组';
                menu.querySelector('ul').appendChild(deleteGroupItem);
            }
            deleteGroupItem.style.display = 'block';
        }
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
                break;
            case 'add-to-group':
                if (this.currentEditItemId) {
                    this.showAddToGroupDialog();
                }
                break;
            case 'edit-group':
                if (this.currentEditItemId) {
                    this.openEditGroupModal(this.currentEditItemId);
                }
                break;
            case 'add-item-to-group':
                if (this.currentEditItemId) {
                    this.showAddItemToGroupDialog(this.currentEditItemId);
                }
                break;
            case 'delete-group':
                if (this.currentEditItemId) {
                    if (confirm('确定要删除这个工具组吗？')) {
                        this.model.deleteNavigationItem(this.currentEditItemId);
                        this.renderNavigationGrid();
                        this.renderNavList();
                        this.showToast('已删除工具组');
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

    // 显示"添加到工具组"对话框
    showAddToGroupDialog() {
        const groups = this.model.getNavigationItems().filter(item => item.type === 'group');
        if (groups.length === 0) {
            this.showToast('没有可用的工具组，请先创建工具组', 'error');
            return;
        }

        const groupNames = groups.map(group => group.name).join('\n');
        const selectedGroupName = prompt(`请输入要添加到的工具组名称：\n\n可用工具组：\n${groupNames}`);
        
        if (selectedGroupName) {
            const selectedGroup = groups.find(group => group.name === selectedGroupName);
            if (selectedGroup) {
                const success = this.model.addItemToGroup(selectedGroup.id, this.currentEditItemId);
                if (success) {
                    this.renderNavigationGrid();
                    this.renderNavList();
                    this.showToast(`已添加到工具组"${selectedGroupName}"`);
                } else {
                    this.showToast('添加失败，该项目可能已在工具组中', 'error');
                }
            } else {
                this.showToast('未找到指定的工具组', 'error');
            }
        }
    }

    // 显示"添加项到工具组"对话框
    showAddItemToGroupDialog(groupId) {
        const items = this.model.getNavigationItems().filter(item => item.type === 'item');
        if (items.length === 0) {
            this.showToast('没有可用的导航项', 'error');
            return;
        }

        const itemNames = items.map(item => item.name).join('\n');
        const selectedItemName = prompt(`请输入要添加到工具组的项名称：\n\n可用项：\n${itemNames}`);
        
        if (selectedItemName) {
            const selectedItem = items.find(item => item.name === selectedItemName);
            if (selectedItem) {
                const success = this.model.addItemToGroup(groupId, selectedItem.id);
                if (success) {
                    this.renderNavigationGrid();
                    this.renderNavList();
                    this.showToast(`已添加"${selectedItemName}"到工具组`);
                } else {
                    this.showToast('添加失败，该项目可能已在工具组中', 'error');
                }
            } else {
                this.showToast('未找到指定的项', 'error');
            }
        }
    }

    // 打开编辑工具组模态框
    openEditGroupModal(groupId) {
        const group = this.model.getNavigationItems().find(item => item.id === groupId);
        if (!group) return;

        const newName = prompt('请输入工具组新名称：', group.name);
        if (newName && newName.trim() !== group.name) {
            this.model.updateNavigationItem(groupId, { name: newName.trim() });
            this.renderNavigationGrid();
            this.renderNavList();
            this.showToast('工具组已更新');
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