const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const directory = path.resolve(__dirname, '../frontend/public/videos');
const fallback = path.join(directory, 'Athletes_training_in_industrial_gym_romix.mp4');
async function main() {
  const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'romix-home-video-'));
  const configurations = [
    { name: 'romix-principal', input: 'ROMIX_Training_Panoramico_escritorio.mp4', width: 1600, quality: 25 },
    { name: 'romix-principal-mobile', input: 'Athletes_training_in_industrial_gym_romix_celulares.mp4', width: 768, quality: 27 }
  ];
  try {
    for (const { name, input, width, quality } of configurations) {
      const preferred = path.join(directory, input);
      const source = fs.existsSync(preferred) ? preferred : fallback;
      const poster = path.join(temporary, name + '.png');
      execFileSync(ffmpeg, ['-hide_banner','-loglevel','error','-i',source,'-vf',`scale=${width}:-2`,'-an','-c:v','libx264','-preset','slow','-crf',String(quality),'-profile:v','high','-level',width > 1280 ? '4.0' : '3.1','-pix_fmt','yuv420p','-movflags','+faststart','-y',path.join(directory, name + '.mp4')], { stdio: 'inherit' });
      execFileSync(ffmpeg, ['-hide_banner','-loglevel','error','-ss','4','-i',source,'-frames:v','1','-y',poster], { stdio: 'inherit' });
      const buffer = fs.readFileSync(poster);
      await sharp(buffer).resize({width}).webp({quality:78,effort:6}).toFile(path.join(directory,name+'-poster.webp'));
      fs.unlinkSync(poster);
      console.log(name + ': ' + input);
    }
  } finally {
    for (const entry of fs.readdirSync(temporary)) fs.unlinkSync(path.join(temporary,entry));
    fs.rmdirSync(temporary);
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { main };
