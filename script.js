class BosinnClicker {
    constructor() {
        this.gameData = this.loadGameData();
        this.autoClickerInterval = null;
        this.clickTimes = [];
        this.telegramWebApp = window.Telegram?.WebApp;
        this.initData = this.telegramWebApp?.initData || '';
        this.init();
    }

    showTelegramOnlyError() {
        const blockDiv = document.getElementById('telegram-block');
        blockDiv.innerHTML = `
            <div class="telegram-block-content">
                <div class="telegram-block-emoji">🔒</div>
                <h1 class="telegram-block-title">Доступ запрещен</h1>
                <div class="telegram-block-icon">✈️</div>
                <p class="telegram-block-text">
                    Это приложение доступно только через Telegram Web App
                </p>
                <p class="telegram-block-text">
                    Пожалуйста, откройте приложение из Telegram бота
                </p>
                <div class="telegram-block-info">
                    ℹ️ Для доступа найдите бота в Telegram и запустите Web App через меню
                </div>
            </div>
        `;
        blockDiv.classList.remove('hidden');
        document.getElementById('game-container').classList.add('hidden');
    }

    loadGameData() {
        const saved = localStorage.getItem('bosinnGameData');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            tokens: 0,
            rebirth_level: 0,
            click_power: 1,
            auto_clicker: 0
        };
    }

    saveGameData() {
        localStorage.setItem('bosinnGameData', JSON.stringify(this.gameData));
    }

    init() {
        // ALWAYS check if running in Telegram Web App
        if (!this.telegramWebApp || !this.initData) {
            this.showTelegramOnlyError();
            return;
        }
        
        // Initialize Telegram Web App
        this.telegramWebApp.ready();
        this.telegramWebApp.expand();
        this.telegramWebApp.setHeaderColor('#1a1a1a');
        this.telegramWebApp.setBackgroundColor('#1a1a1a');
        
        this.bindGameEvents();
        this.updateUI();
        this.updateBosinnTitle();
        this.startAutoClicker();
    }

    bindGameEvents() {
        const clickBtn = document.getElementById('click-btn');
        const upgradesTab = document.getElementById('upgrades-tab');
        const rebirthTab = document.getElementById('rebirth-tab');
        const upgradesPanel = document.getElementById('upgrades-panel');
        const rebirthPanel = document.getElementById('rebirth-panel');

        clickBtn.addEventListener('click', (e) => this.handleClick(e));

        upgradesTab.addEventListener('click', () => {
            upgradesTab.classList.add('active');
            rebirthTab.classList.remove('active');
            upgradesPanel.classList.remove('hidden');
            rebirthPanel.classList.add('hidden');
        });

        rebirthTab.addEventListener('click', () => {
            rebirthTab.classList.add('active');
            upgradesTab.classList.remove('active');
            rebirthPanel.classList.remove('hidden');
            upgradesPanel.classList.add('hidden');
        });

        document.getElementById('buy-click-power').addEventListener('click', () => this.buyUpgrade('click_power'));
        document.getElementById('buy-auto-clicker').addEventListener('click', () => this.buyUpgrade('auto_clicker'));
        document.getElementById('rebirth-btn').addEventListener('click', () => this.handleRebirth());
    }

    handleClick(event = null) {
        const earned = this.gameData.click_power;
        this.gameData.tokens += earned;
        this.saveGameData();
        this.updateUI();
        this.showMoneyAnimation(earned, event);
    }

    showMoneyAnimation(earned, event = null) {
        const clickArea = document.querySelector('.click-area');
        const now = Date.now();
        
        this.clickTimes.push(now);
        this.clickTimes = this.clickTimes.filter(time => now - time < 1000);
        
        const clicksPerSecond = this.clickTimes.length;
        let animationClass = '';
        if (clicksPerSecond > 7) {
            animationClass = 'super-fast';
        } else if (clicksPerSecond > 4) {
            animationClass = 'fast';
        }
        
        if (event && event.isTrusted) {
            const areaRect = clickArea.getBoundingClientRect();
            const x = ((event.clientX - areaRect.left) / areaRect.width) * 100;
            const y = ((event.clientY - areaRect.top) / areaRect.height) * 100;
            
            const moneyElement = document.createElement('div');
            moneyElement.className = `money-float ${animationClass}`;
            moneyElement.textContent = `+${this.formatNumber(earned)}`;
            moneyElement.style.left = `${x}%`;
            moneyElement.style.top = `${y}%`;
            
            clickArea.appendChild(moneyElement);
            
            const duration = animationClass === 'super-fast' ? 400 : animationClass === 'fast' ? 600 : 1000;
            setTimeout(() => {
                if (moneyElement.parentNode) {
                    moneyElement.parentNode.removeChild(moneyElement);
                }
            }, duration);
        } else {
            const numElements = Math.min(2 + Math.floor(clicksPerSecond / 4), 5);
            
            for (let i = 0; i < numElements; i++) {
                const moneyElement = document.createElement('div');
                moneyElement.className = `money-float ${animationClass}`;
                moneyElement.textContent = `+${this.formatNumber(earned)}`;
                
                const angle = (Math.PI * 2 * i) / numElements + (Math.random() * 0.5 - 0.25);
                const radius = 50 + Math.random() * 15;
                const x = 50 + Math.cos(angle) * radius;
                const y = 50 + Math.sin(angle) * radius;
                
                moneyElement.style.left = `${x}%`;
                moneyElement.style.top = `${y}%`;
                
                clickArea.appendChild(moneyElement);
                
                const duration = animationClass === 'super-fast' ? 400 : animationClass === 'fast' ? 600 : 1000;
                setTimeout(() => {
                    if (moneyElement.parentNode) {
                        moneyElement.parentNode.removeChild(moneyElement);
                    }
                }, duration);
            }
        }
    }

    buyUpgrade(type) {
        const costs = {
            click_power: Math.floor(10 * Math.pow(1.5, this.gameData.click_power - 1)),
            auto_clicker: Math.floor(100 * Math.pow(2, this.gameData.auto_clicker))
        };

        const maxLevels = {
            auto_clicker: 20
        };

        if (maxLevels[type] && this.gameData[type] >= maxLevels[type]) {
            alert('Достигнут максимальный уровень!');
            return;
        }

        if (this.gameData.tokens >= costs[type]) {
            this.gameData.tokens -= costs[type];
            this.gameData[type]++;
            this.saveGameData();
            this.updateUI();
            
            if (type === 'auto_clicker') {
                this.startAutoClicker();
            }
        } else {
            alert('Недостаточно токенов!');
        }
    }

    handleRebirth() {
        const rebirthCost = Math.floor(10000 * Math.pow(10, this.gameData.rebirth_level));
        
        if (this.gameData.rebirth_level >= 5) {
            alert('Вы достигли максимального уровня перерождения!');
            return;
        }
        
        if (this.gameData.tokens < rebirthCost) {
            alert('Недостаточно токенов для перерождения!');
            return;
        }
        
        if (!confirm('Вы уверены, что хотите переродиться? Весь прогресс будет сброшен!')) {
            return;
        }
        
        this.gameData.rebirth_level++;
        this.gameData.tokens = 0;
        this.gameData.click_power = 1;
        this.gameData.auto_clicker = 0;
        
        this.saveGameData();
        this.updateUI();
        this.updateBosinnTitle();
        this.startAutoClicker();
        
        alert(`Поздравляем! Вы достигли ${this.gameData.rebirth_level} уровня перерождения!`);
    }

    updateUI() {
        document.getElementById('tokens-count').textContent = this.formatNumber(this.gameData.tokens);
        document.getElementById('rebirth-level').textContent = this.gameData.rebirth_level;

        document.getElementById('click-power-level').textContent = this.gameData.click_power;
        document.getElementById('auto-clicker-level').textContent = this.gameData.auto_clicker;

        const clickPowerCost = Math.floor(10 * Math.pow(1.5, this.gameData.click_power - 1));
        const autoClickerCost = Math.floor(100 * Math.pow(2, this.gameData.auto_clicker));

        document.getElementById('click-power-cost').textContent = this.formatNumber(clickPowerCost);
        document.getElementById('auto-clicker-cost').textContent = this.formatNumber(autoClickerCost);

        const maxAutoClicker = 20;
        
        document.getElementById('buy-click-power').disabled = this.gameData.tokens < clickPowerCost;
        document.getElementById('buy-auto-clicker').disabled = 
            this.gameData.tokens < autoClickerCost || this.gameData.auto_clicker >= maxAutoClicker;

        if (this.gameData.auto_clicker >= maxAutoClicker) {
            document.getElementById('auto-clicker-cost').textContent = 'МАКС';
        }

        document.getElementById('current-rebirth').textContent = this.gameData.rebirth_level;
        document.getElementById('next-multiplier').textContent = this.gameData.rebirth_level + 2;
        
        const rebirthCost = Math.floor(10000 * Math.pow(10, this.gameData.rebirth_level));
        document.getElementById('rebirth-cost').textContent = this.formatNumber(rebirthCost);
        document.getElementById('rebirth-btn').disabled = this.gameData.tokens < rebirthCost || this.gameData.rebirth_level >= 5;
    }

    updateBosinnTitle() {
        const titles = [
            'Новичок Босинн',
            'Босинн Cheap', 
            'Босинн Smiley',
            'Босинн Brutal',
            'Босинн Elite',
            'Босинн Omega'
        ];
        
        const images = [
            'bosinn_cheap.png',
            'bosinn_cheap.png',
            'bosinn_smiley.png',
            'bosinn_elite.png',
            'bosinn_elite.png',
            'bosinn_omega.png'
        ];
        
        const level = this.gameData.rebirth_level;
        document.getElementById('bosinn-name').textContent = titles[level];
        document.getElementById('bosinn-avatar').src = images[level];
        document.getElementById('click-image').src = images[level];
    }

    startAutoClicker() {
        this.stopAutoClicker();
        
        if (this.gameData.auto_clicker > 0) {
            this.autoClickerInterval = setInterval(() => {
                this.handleClick();
            }, Math.max(100, 1000 - (this.gameData.auto_clicker * 50)));
        }
    }

    stopAutoClicker() {
        if (this.autoClickerInterval) {
            clearInterval(this.autoClickerInterval);
            this.autoClickerInterval = null;
        }
    }

    formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BosinnClicker();
});
