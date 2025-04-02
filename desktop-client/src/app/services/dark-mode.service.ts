import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class DarkModeService {
    public renderer: Renderer2;
    public isDarkMode: boolean;

    constructor(rendererFactory: RendererFactory2) {
        this.renderer = rendererFactory.createRenderer(null, null);
        // Initialize dark mode based on localStorage or system preference
        this.initializeDarkModePreference();
    }

    initializeDarkModePreference(): void {
        const darkModeSetting = localStorage.getItem('darkMode');
        this.isDarkMode = darkModeSetting ? JSON.parse(darkModeSetting) : false;
        this.applyDarkMode(this.isDarkMode);
    }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('darkMode', JSON.stringify(this.isDarkMode));
        this.applyDarkMode(this.isDarkMode);
    }

    private applyDarkMode(enable: boolean): void {
        if (enable) {
            this.renderer.addClass(document.body, 'dark');
        } else {
            this.renderer.removeClass(document.body, 'dark');
        }
    }
}
