const continueButton = document.getElementById('continueButton');
if (continueButton) {
  continueButton.addEventListener('click', () => {
    window.location.assign('/room');
  });
}
