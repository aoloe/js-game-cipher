Character = function(c, i) {
  this.c = c;
  this.i = i;
  this.hint = i === 0;
  this.transform = null;
}
Character.in_clear = new Set([' ', ',', '!', '?', '.', '(', ')', ';', ':', '%', '/', '*', '"', '«', '»', '„', '“', '”', '-', '\'', "\n"]);
// map of diacritics: â → [^, a]
Character.diacritics = new Map([
  ['à', ['`', 'a']], ['á', ['\'', 'a']],['â', ['^', 'a']], ['ä', ['"', 'a']],
  ['è', ['`', 'e']], ['é', ['\'', 'e']],['ê', ['^', 'e']], ['ë', ['"', 'i']],
  ['ì', ['`', 'i']], ['í', ['\'', 'i']],['î', ['^', 'i']], ['ï', ['"', 'i']],
  ['ò', ['`', 'o']], ['ó', ['\'', 'o']],['ô', ['^', 'o']], ['ö', ['"', 'o']],
  ['ù', ['`', 'u']], ['ú', ['\'', 'u']],['û', ['^', 'u']], ['ü', ['"', 'u']],
  ['ç', [',', 'c']], ['ñ', ['~', 'n']],
]);
// reversed map of diactritics: ^ → a → â / ^ → o → ô / ...
Character.letter_to_diacritics = new Map();
for (let item of Character.diacritics) {
  let l_t_d = Character.letter_to_diacritics.get(item[1][0]);
  if (typeof(l_t_d) === 'undefined') {
    Character.letter_to_diacritics.set(item[1][0], new Map([[item[1][1], item[0]]]));
  } else {
    l_t_d.set(item[1][1], item[0]);
  }
}

Character.is_uppercase = function(c) {
  return c === c.toUpperCase();
}
Character.is_clear = function(c) {
    return Character.in_clear.has(c);
}
Sentence = function(sentence) {
    this.characters = [];
    this.transformations = [];

    let characters = new Map();

    let i = 1;
    let hint = false;
    let n_dashes = 0;
    for (let j = 0; j < sentence.length; j++) {
      let c = sentence[j];
      if (c === '_') {
        hint = !hint;
        n_dashes++;
        continue;
      } else if (hint || Character.is_clear(c)) {
        this.characters.push(new Character(c, 0));
      } else {
        let t = {};
        if (Character.is_uppercase(c)) {
          c = c.toLowerCase();
          t.uppercase = true;
        }
        if (Character.diacritics.has(c)) {
          let d = Character.diacritics.get(c);
          c = d[1];
          t.diacritics = d[0];
        }
        if (Object.keys(t).length > 0) {
          this.transformations[j - n_dashes] = t;
        }
        if (!characters.has(c)) {
          characters.set(c, new Character(null, i));
          i++;
        }
        this.characters.push(characters.get(c));
      }
    }
}

// TODO: move down the constructor as soon as we have two of them
Sentence.from_string = function(sentence) {
    return new Sentence(sentence);
}
Sentence.prototype.has = function(c) {
  if (c.c === null || c.c === '') {
    return false;
  }
  for (character of this.characters) {
    if ( character.i > 0 && character.c === c.c && character.i !== c.i) {
      return true;
    }
  }
  return false;
}

Cipher = function() {
}

Cipher.get_basedir = function get_basedir(url) {
  return url.slice(-1) == '/' ? url.slice(0, -1) : url.split('/').slice(0,-1).join('/');
}

// https://stackoverflow.com/a/2117523/5239250
Cipher.uuidv4 = function () {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

Cipher.pusher_channel_factory = (function() {
  var pusher_instance = null;
  var channels = new Map();
  return {
    get_instance: function(channel_name) {
      if (pusher_instance === null) {
        Pusher.logToConsole = false;
        pusher = new Pusher(
          '1e754324fb908641cba9', {
            cluster: 'eu',
            forceTLS: true
        });
      }
      if (!channels.has(channel_name)) {
          channels.set(channel_name, pusher.subscribe(channel_name));
      }
      return channels.get(channel_name);
    }
  }
})();

/// https://github.com/kvz/locutus/blob/master/src/php/strings/sha1.js
Cipher.sha1 = function(str) {
  //  discuss at: https://locutus.io/php/sha1/
  // original by: Webtoolkit.info (https://www.webtoolkit.info/)
  // improved by: Michael White (https://getsprink.com)
  // improved by: Kevin van Zonneveld (https://kvz.io)
  //    input by: Brett Zamir (https://brett-zamir.me)
  //      note 1: Keep in mind that in accordance with PHP, the whole string is buffered and then
  //      note 1: hashed. If available, we'd recommend using Node's native crypto modules directly
  //      note 1: in a steaming fashion for faster and more efficient hashing
  //   example 1: sha1('Kevin van Zonneveld')
  //   returns 1: '54916d2e62f65b3afa6e192e6a601cdbe5cb5897'

  var hash
  try {
    var crypto = require('crypto')
    var sha1sum = crypto.createHash('sha1')
    sha1sum.update(str)
    hash = sha1sum.digest('hex')
  } catch (e) {
    hash = undefined
  }

  if (hash !== undefined) {
    return hash
  }

  var _rotLeft = function (n, s) {
    var t4 = (n << s) | (n >>> (32 - s))
    return t4
  }

  var _cvtHex = function (val) {
    var str = ''
    var i
    var v

    for (i = 7; i >= 0; i--) {
      v = (val >>> (i * 4)) & 0x0f
      str += v.toString(16)
    }
    return str
  }

  var blockstart
  var i, j
  var W = new Array(80)
  var H0 = 0x67452301
  var H1 = 0xEFCDAB89
  var H2 = 0x98BADCFE
  var H3 = 0x10325476
  var H4 = 0xC3D2E1F0
  var A, B, C, D, E
  var temp

  // utf8_encode
  str = unescape(encodeURIComponent(str))
  var strLen = str.length

  var wordArray = []
  for (i = 0; i < strLen - 3; i += 4) {
    j = str.charCodeAt(i) << 24 |
      str.charCodeAt(i + 1) << 16 |
      str.charCodeAt(i + 2) << 8 |
      str.charCodeAt(i + 3)
    wordArray.push(j)
  }

  switch (strLen % 4) {
    case 0:
      i = 0x080000000
      break
    case 1:
      i = str.charCodeAt(strLen - 1) << 24 | 0x0800000
      break
    case 2:
      i = str.charCodeAt(strLen - 2) << 24 | str.charCodeAt(strLen - 1) << 16 | 0x08000
      break
    case 3:
      i = str.charCodeAt(strLen - 3) << 24 |
        str.charCodeAt(strLen - 2) << 16 |
        str.charCodeAt(strLen - 1) <<
      8 | 0x80
      break
  }

  wordArray.push(i)

  while ((wordArray.length % 16) !== 14) {
    wordArray.push(0)
  }

  wordArray.push(strLen >>> 29)
  wordArray.push((strLen << 3) & 0x0ffffffff)

  for (blockstart = 0; blockstart < wordArray.length; blockstart += 16) {
    for (i = 0; i < 16; i++) {
      W[i] = wordArray[blockstart + i]
    }
    for (i = 16; i <= 79; i++) {
      W[i] = _rotLeft(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1)
    }

    A = H0
    B = H1
    C = H2
    D = H3
    E = H4

    for (i = 0; i <= 19; i++) {
      temp = (_rotLeft(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff
      E = D
      D = C
      C = _rotLeft(B, 30)
      B = A
      A = temp
    }

    for (i = 20; i <= 39; i++) {
      temp = (_rotLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff
      E = D
      D = C
      C = _rotLeft(B, 30)
      B = A
      A = temp
    }

    for (i = 40; i <= 59; i++) {
      temp = (_rotLeft(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff
      E = D
      D = C
      C = _rotLeft(B, 30)
      B = A
      A = temp
    }

    for (i = 60; i <= 79; i++) {
      temp = (_rotLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff
      E = D
      D = C
      C = _rotLeft(B, 30)
      B = A
      A = temp
    }

    H0 = (H0 + A) & 0x0ffffffff
    H1 = (H1 + B) & 0x0ffffffff
    H2 = (H2 + C) & 0x0ffffffff
    H3 = (H3 + D) & 0x0ffffffff
    H4 = (H4 + E) & 0x0ffffffff
  }

  temp = _cvtHex(H0) + _cvtHex(H1) + _cvtHex(H2) + _cvtHex(H3) + _cvtHex(H4)
  return temp.toLowerCase()
}
