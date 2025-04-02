import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
    selector: '[appDraggable]',
})
export class DraggableDirective {
    private dragging = false;
    private offset = { x: 0, y: 0 };

    constructor(private el: ElementRef, private renderer: Renderer2) {
        this.renderer.setStyle(this.el.nativeElement, 'position', 'fixed');
    }

    @HostListener('mousedown', ['$event'])
    onMousedown(event: MouseEvent) {
        this.dragging = true;
        this.offset.x = event.clientX - this.el.nativeElement.getBoundingClientRect().left;
        this.offset.y = event.clientY - this.el.nativeElement.getBoundingClientRect().top;
        event.preventDefault();
    }

    @HostListener('document:mousemove', ['$event'])
    onMousemove(event: MouseEvent) {
        if (this.dragging) {
            this.renderer.setStyle(this.el.nativeElement, 'left', `${event.clientX - this.offset.x}px`);
            this.renderer.setStyle(this.el.nativeElement, 'top', `${event.clientY - this.offset.y}px`);
        }
    }

    @HostListener('document:mouseup')
    onMouseup() {
        this.dragging = false;
    }
}
