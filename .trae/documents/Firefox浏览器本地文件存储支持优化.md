## Firefox浏览器本地文件存储支持优化

### 问题分析
1. 当前项目已实现了`FirefoxStorageAdapter`类，支持Firefox浏览器的本地文件存储
2. 但HTML中的存储说明模态框仍显示文件存储功能仅支持Chrome、Edge和Opera浏览器
3. 需要更新存储说明文本，并确保Firefox浏览器能正确使用FirefoxStorageAdapter

### 实现计划
1. **更新存储说明文本**
   - 修改`index.html`中`storage-info-modal`的兼容性说明，将Firefox添加到支持列表
   - 说明Firefox使用替代方案实现本地文件存储

2. **优化Firefox浏览器检测逻辑**
   - 确保`isFirefox()`方法能准确检测Firefox浏览器
   - 验证`createStorageAdapter()`方法能为Firefox浏览器正确选择`FirefoxStorageAdapter`

3. **完善FirefoxStorageAdapter的使用体验**
   - 确保FirefoxStorageAdapter的所有方法正常工作
   - 验证文件的读取、写入和管理功能

4. **测试验证**
   - 在Firefox浏览器中测试本地文件存储功能
   - 验证文件导入/导出功能正常工作
   - 确保数据能正确保存和加载

### 预期效果
- Firefox浏览器用户能看到准确的存储支持说明
- Firefox浏览器能正确使用本地文件存储功能
- 用户可以在Firefox浏览器中导入、导出和管理设置文件
- 保持与其他浏览器的功能一致性