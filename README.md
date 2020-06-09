# Cipher game

I've creatd this game for my family and friends.  
The main goal being to learn more about vue.js and experiment with a simple multiplier mode.

## Install

- `git clone https://github.com/aoloe/js-game-cipher.git cipher`
- `cd api && composer install`
- `wget https://raw.githubusercontent.com/aoloe/php-tiny-rest/master/src/TinyRest.php`
- create the `api/config.php` file (based on `api/config-demo.php`)

## Todo

- filter by language and by own
- in edit mode, state that underline shows the words
- in play mode do not send the plain sentence
- does the share still work?
- capture the back button
  - probably use vue router: <https://router.vuejs.org/guide/>
  - <https://stackoverflow.com/questions/12381563/how-to-stop-browser-back-button-using-javascript>
  - `window.location.hash`?
  - `onbeforeunload`?
  - `window.onpopstate`?
  - `document.backbutton`? <https://stackoverflow.com/questions/47974777/can-i-handle-back-button-within-methods-in-vuejs-2>
- mark a cipher as done
- initial sync with others
- use the button style from <https://codepen.io/bilalo05/pen/oNgrKXo> ?
- trim spaces and replace multiple spaces by single ones.
