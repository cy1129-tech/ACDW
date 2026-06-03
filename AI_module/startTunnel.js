const { exec } = require('child_process');
// 直接运行 lt 命令
exec('lt --port 10000 --subdomain my-acdw-project', (error, stdout, stderr) => {
    if (error) {
        console.error(`执行出错: ${error}`);
        return;
    }
    console.log(`输出: ${stdout}`);
});