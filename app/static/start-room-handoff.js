const continueButton = document.getElementById('continueButton');
const summaryCard = document.getElementById('summaryCard');

if (summaryCard && continueButton) {
  const scrollToConfirmation = () => {
    if (!summaryCard.hidden) {
      window.setTimeout(() => {
        continueButton.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        continueButton.classList.add('confirmation-ready');
        window.setTimeout(() => continueButton.classList.remove('confirmation-ready'), 900);
      }, 120);
    }
  };

  new MutationObserver(scrollToConfirmation).observe(summaryCard, {
    attributes: true,
    attributeFilter: ['hidden'],
  });
}

if (continueButton) {
  continueButton.addEventListener('click', () => {
    window.location.assign('/room');
  });
}
