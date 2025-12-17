function parseQuality(filename) {
  const name = filename.toLowerCase();
  
  if (name.includes('2160p') || name.includes('4k') || name.includes('uhd')) {
    return '4K';
  }
  if (name.includes('1080p')) {
    return '1080p';
  }
  if (name.includes('720p')) {
    return '720p';
  }
  if (name.includes('480p')) {
    return '480p';
  }
  if (name.includes('cam') || name.includes('hdcam')) {
    return 'CAM';
  }
  if (name.includes('hdts') || name.includes('telesync')) {
    return 'HDTS';
  }
  if (name.includes('predvd') || name.includes('dvdscr')) {
    return 'PreDVD';
  }
  
  return 'Unknown';
}

function parseSource(filename) {
  const name = filename.toLowerCase();
  
  if (name.includes('bluray') || name.includes('bdrip') || name.includes('brrip')) {
    return 'BluRay';
  }
  if (name.includes('web-dl') || name.includes('webdl')) {
    return 'WEB-DL';
  }
  if (name.includes('webrip')) {
    return 'WEBRip';
  }
  if (name.includes('hdrip')) {
    return 'HDRip';
  }
  if (name.includes('dvdrip')) {
    return 'DVDRip';
  }
  if (name.includes('hdtv')) {
    return 'HDTV';
  }
  
  return null;
}

function parseCodec(filename) {
  const name = filename.toLowerCase();
  
  if (name.includes('x265') || name.includes('hevc') || name.includes('h265')) {
    return 'HEVC';
  }
  if (name.includes('x264') || name.includes('h264')) {
    return 'H.264';
  }
  if (name.includes('av1')) {
    return 'AV1';
  }
  
  return null;
}

function parseAudio(filename) {
  const name = filename.toLowerCase();
  const audioFormats = [];
  
  if (name.includes('atmos')) {
    audioFormats.push('Atmos');
  }
  if (name.includes('truehd')) {
    audioFormats.push('TrueHD');
  }
  if (name.includes('dts-hd') || name.includes('dts hd')) {
    audioFormats.push('DTS-HD');
  }
  if (name.includes('dts')) {
    audioFormats.push('DTS');
  }
  if (name.includes('dd+') || name.includes('ddp') || name.includes('eac3')) {
    audioFormats.push('DD+');
  }
  if (name.includes('dd5.1') || name.includes('ac3')) {
    audioFormats.push('DD5.1');
  }
  if (name.includes('aac')) {
    audioFormats.push('AAC');
  }
  
  return audioFormats.length > 0 ? audioFormats.join(' ') : null;
}

function parseLanguages(filename) {
  const name = filename.toLowerCase();
  const languages = [];
  
  if (name.includes('tamil')) languages.push('Tamil');
  if (name.includes('telugu')) languages.push('Telugu');
  if (name.includes('hindi')) languages.push('Hindi');
  if (name.includes('english') || name.includes('eng')) languages.push('English');
  if (name.includes('malayalam')) languages.push('Malayalam');
  if (name.includes('kannada')) languages.push('Kannada');
  
  if (name.includes('multi') || name.includes('dual')) {
    return 'Multi Audio';
  }
  
  return languages.length > 0 ? languages.join('+') : null;
}

function parseSize(filename) {
  const sizeMatch = filename.match(/(\d+(?:\.\d+)?)\s*(GB|MB|gb|mb)/i);
  if (sizeMatch) {
    const size = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2].toUpperCase();
    
    if (unit === 'GB') {
      return `${size.toFixed(1)} GB`;
    } else if (unit === 'MB') {
      if (size >= 1024) {
        return `${(size / 1024).toFixed(1)} GB`;
      }
      return `${size.toFixed(0)} MB`;
    }
  }
  
  return null;
}

function formatStreamName(magnet) {
  const quality = parseQuality(magnet.name || '');
  const source = parseSource(magnet.name || '');
  const codec = parseCodec(magnet.name || '');
  
  let name = `🧲 Torrent\n📹 ${quality}`;
  
  if (source) {
    name += ` ${source}`;
  }
  
  if (codec) {
    name += `\n💿 ${codec}`;
  }
  
  return name;
}

function formatStreamTitle(magnet) {
  const name = magnet.name || magnet.title || 'Unknown';
  const audio = parseAudio(name);
  const languages = parseLanguages(name);
  const size = parseSize(name);
  
  let title = name.length > 80 ? name.substring(0, 77) + '...' : name;
  
  const details = [];
  if (languages) details.push(`🗣️ ${languages}`);
  if (audio) details.push(`🔊 ${audio}`);
  if (size) details.push(`💾 ${size}`);
  
  if (details.length > 0) {
    title += '\n' + details.join(' | ');
  }
  
  return title;
}

function formatTorBoxStreamName(magnet) {
  const quality = parseQuality(magnet.name || '');
  const source = parseSource(magnet.name || '');
  
  let name = `⚡ TorBox\n📹 ${quality}`;
  
  if (source) {
    name += ` ${source}`;
  }
  
  return name;
}

module.exports = {
  parseQuality,
  parseSource,
  parseCodec,
  parseAudio,
  parseLanguages,
  parseSize,
  formatStreamName,
  formatStreamTitle,
  formatTorBoxStreamName,
};
