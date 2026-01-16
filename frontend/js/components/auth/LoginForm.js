export function renderLoginForm() {
  const wrapper = document.createElement("div");
  wrapper.className = "hero";
  wrapper.innerHTML = `
    <div class="md-card auth-card animate-fade">
      <div class="brand">
        <div class="logo">PT</div>
        <div>
          <div style="font-weight:800;">Пропуска автотранспорта</div>
          <p></p>
        </div>
      </div>
      <form id="login-form" class="section">
        <div class="md-field">
          <label for="username">Логин</label>
          <input class="md-input" id="username" name="username" placeholder="Введите логин" required>
        </div>
        <div class="md-field">
          <label for="password">Пароль</label>
          <input class="md-input" id="password" type="password" name="password" placeholder="Введите пароль" required>
        </div>
        <button class="md-btn" type="submit">
          <span class="material-icons-round">login</span>
          Войти
        </button>
      </form>
    </div>
  `;
  return wrapper;
}
