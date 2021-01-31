const SETTINGS_MUTE = 'SETTINGS_MUTE';
const SETTINGS_VOLUME = 'SETTINGS_VOLUME';

class AudioPlayer {
  _audio = {
    bg: new Howl({
      src: ['/snd/bgmusic.webm'],
      loop: true
    }),
    sounds: new Howl({
      src: ['/snd/sounds.webm'],
      sprite: {
        hover: [0, 113],
        hout: [114, 187]
      }
    })
  };
  _mute = false;
  _volume = 1.0;

  init() {
    this.mute = localStorage.getItem(SETTINGS_MUTE) || false;
    this.volume = parseFloat(localStorage.getItem(SETTINGS_VOLUME)) || 100;
  }

  get mute() {
    return this._mute;
  }

  set mute(mute) {
    this._mute = mute;
    localStorage.setItem(SETTINGS_MUTE, `${this._mute}`);
    Howler.mute(this._mute);
  }

  get volume() {
    return this._volume;
  }

  set volume(volume) {
    this._volume = volume;
    localStorage.setItem(SETTINGS_VOLUME, this._volume);
    Howler.volume(this._volume);
  }

  play(key) {
    this._audio.sounds.play(key);
  }

  stop(key) {
    this._audio.sounds.stop(key);
  }

}

const leAudio = new AudioPlayer();
