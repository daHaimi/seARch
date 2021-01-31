const showMsg = (username, type) => {
  const msg = $('<div>');
  let txt = '';
  switch (type) {
    case 'point':
      txt = 'found one';
      break;
    case 'fail':
      txt = 'failed';
      break;
    case 'register':
      txt = 'joined';
      break;
    case 'unregister':
      txt = 'left the game';
      break;
  }
  msg.addClass('popup')
      .addClass(type)
      .text(username + ` ${txt}!`)
      .delay(500)
      .animate({
        top: '8em',
        opacity: 0,
      }, 1000, null, () => $(this).remove());
  msg.appendTo('body');
};

const modal = (message, className) => {
  const modal = $('<div>');
  modal.addClass('modal');

  const msg = $('<div>');
  msg.addClass('winmsg')
      .text(message);
  if (className) {
    msg.addClass(className)
  }
  modal.append(msg);

  modal.appendTo('body');
};

const clearModal = () => {
  document.querySelectorAll('div.modal').forEach(e => e.remove());
};
