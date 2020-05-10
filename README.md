# Cipher game

## Install

- `git clone https://github.com/aoloe/js-game-cipher.git cipher`
- `cd api && composer install`
- `wget https://raw.githubusercontent.com/aoloe/php-tiny-rest/master/src/TinyRest.php`
- create the `api/config.php` file (based on `api/config-demo.php`)

## Todo

- two columns?
- filter by language and by own
- in edit mode, state that underline shows the words
- does the share still work?
- fine di linea  senza dividere le parole
- capture the back button
  - probably use vue router: <https://router.vuejs.org/guide/>
  - <https://stackoverflow.com/questions/12381563/how-to-stop-browser-back-button-using-javascript>
  - `window.location.hash`?
  - `onbeforeunload`?
  - `window.onpopstate`?
  - `document.backbutton`? <https://stackoverflow.com/questions/47974777/can-i-handle-back-button-within-methods-in-vuejs-2>
- mark a cipher as done
- initial sync with others
- editing (deleting) existing sentences by their author.
- import / export sentences.
- use the button style from <https://codepen.io/bilalo05/pen/oNgrKXo> ?
