// COS 配置
const COS_CONFIG = {
    SecretId: "AKIDfDYfqnW0INDn8E5h4B4i7JI2XptjKgnh",
    SecretKey: "jDUYOzKSM1RcYE7oGTRmxuc4II4bsuhF",
    Bucket: "love-1410636252",
    Region: "ap-guangzhou"
};

// 初始化 COS 实例
const cos = new COS({
    SecretId: COS_CONFIG.SecretId,
    SecretKey: COS_CONFIG.SecretKey
});

// 数据 API 封装
const API = {
    // 获取 JSON 数据
    async getData(key, defaultValue = []) {
        return new Promise((resolve) => {
            // 添加随机参数防止缓存
            const finalKey = `${key}?_t=${Date.now()}`;
            
            cos.getObject({
                Bucket: COS_CONFIG.Bucket,
                Region: COS_CONFIG.Region,
                Key: key, // 注意：Key本身不能变，我们通过Cache-Control头来控制
                Headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            }, function(err, data) {
                if (err || !data.Body) {
                    console.log(`[COS] Load ${key} failed or empty, using default.`);
                    resolve(defaultValue);
                } else {
                    try {
                        const json = JSON.parse(data.Body.toString());
                        resolve(json);
                    } catch (e) {
                        console.error(`[COS] Parse ${key} error:`, e);
                        resolve(defaultValue);
                    }
                }
            });
        });
    },

    // 保存 JSON 数据
    async saveData(key, data) {
        return new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: COS_CONFIG.Bucket,
                Region: COS_CONFIG.Region,
                Key: key,
                Body: JSON.stringify(data),
            }, function(err, data) {
                if (err) {
                    console.error(`[COS] Save ${key} failed:`, err);
                    alert('保存失败，请检查网络或联系管理员');
                    reject(err);
                } else {
                    console.log(`[COS] Save ${key} success`);
                    resolve(data);
                }
            });
        });
    },

    // 上传文件 (返回 URL)
    async uploadFile(file, folder = 'uploads/') {
        // 白名单检查
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        // 获取文件后缀名（小写）
        const ext = file.name.split('.').pop().toLowerCase();
        
        // 如果不在白名单内，且不是图片/视频类型开头（双重校验）
        if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
             console.warn(`[COS] Blocked file type: ${file.type}, ext: ${ext}`);
             // 这里可以选择抛出错误，或者返回 null 让上层处理
             // 为了用户体验，我们暂时抛出错误
             throw new Error('不支持的文件类型');
        }

        // 使用时间戳+随机数生成唯一文件名
        const key = `${folder}${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        
        return new Promise((resolve, reject) => {
            cos.putObject({
                Bucket: COS_CONFIG.Bucket,
                Region: COS_CONFIG.Region,
                Key: key,
                Body: file,
            }, function(err, data) {
                if (err) {
                    console.error(`[COS] Upload file failed:`, err);
                    reject(err);
                } else {
                    // 构建访问 URL
                    const url = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${key}`;
                    resolve(url);
                }
            });
        });
    }
};