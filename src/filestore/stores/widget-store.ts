import { ByteBuffer } from '@runejs/core';

import { FileIndex } from '../file-index';
import { Filestore } from '../filestore';
import { FileData } from '../file-data';
import { Archive } from '../archive';


export abstract class WidgetBase {
    id: number;
    parentId: number;
    type: number;
    format: number;
    originalX: number;
    originalY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    menuType: number;
    contentType: number;
    opacity: number;
    hidden: boolean;
    targetVerb: string;
    spellName: string;
    clickMask: number;
    hintText: string;
    hoveredSiblingId: number;
    alternateOperators: number[];
    alternateRhs: number[];
    cs1: number[][];

    hasListeners: boolean;
}

export class ParentWidget extends WidgetBase {
    children: WidgetBase[];

    constructor(id: number) {
        super();
        this.id = id;
    }
}

export class ContainerWidget extends WidgetBase {
    type: number = 0;
    scrollHeight: number;
    scrollPosition: number;
    scrollWidth: number;
    children?: WidgetBase[];
}

export class TextWidget extends WidgetBase {
    type: number = 1;
    textAlignmentX: number;
    textAlignmentY: number;
    lineHeight: number;
    fontId: number;
    textShadowed: boolean;
    textColor: number;
}

export class InteractableItemWidget extends WidgetBase {
    type: number = 2;
    items: number[];
    itemAmounts: number[];
    itemSwapable: boolean;
    isInventory: boolean;
    itemUsable: boolean;
    itemDeletesDraged: boolean;
    itemSpritePadsX: number;
    itemSpritePadsY: number;
    imageX: number[];
    imageY: number[];
    images: number[];
    options: string[];
}

export class RectangleWidget extends WidgetBase {
    type: number = 3;
    filled: boolean;
    textColor: number;
    alternateTextColor: number;
    hoveredTextColor: number;
    alternateHoveredTextColor: number;
}

export class LinkWidget extends WidgetBase {
    type: number = 4;
    textAlignmentX: number;
    textAlignmentY: number;
    lineHeight: number;
    fontId: number;
    textShadowed: boolean;
    text: string;
    alternateText: string;
    textColor: number;
    alternateTextColor: number;
    hoveredTextColor: number;
    alternateHoveredTextColor: number;
}

export class SpriteWidget extends WidgetBase {
    type: number = 5;
    spriteId: number;
    alternateSpriteId: number;

    textureId: number;
    tiled: boolean;
}

export class ModelWidget extends WidgetBase {
    type: number = 6;
    modelType: number;
    modelId: number;
    alternateModelType: number;
    alternateModelId: number;
    animation: number;
    alternateAnimation: number;
    modelZoom: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    offsetX: number;
    offsetY: number;
    orthogonal: boolean;
}

export class StaticItemWidget extends WidgetBase {
    type: number = 7;
    items: number[];
    itemAmounts: number[];
    isInventory: boolean;
    itemSpritePadsX: number;
    itemSpritePadsY: number;
    options: string[];
    textAlignmentX: number;
    fontId: number;
    textShadowed: boolean;
    textColor: number;
}

export class TooltipWidget extends WidgetBase {
    type: number = 8;
    text: string;
}

export class LineWidget extends WidgetBase {
    type: number = 9;
    lineWidth: number;
    textColor: number;
}


/**
 * Controls game interface widget file format and storage.
 */
export class WidgetStore {

    /**
     * The main file index of the widget store.
     */
    public readonly widgetFileIndex: FileIndex;

    public constructor(private fileStore: Filestore) {
        this.widgetFileIndex = fileStore.getIndex('widgets');
    }

    public decodeWidget(id: number): WidgetBase {
        const file = this.widgetFileIndex.files.get(id);
        if(file.type === 'file') {
            return this.decodeWidgetFile(id, file);
        } else if(file.type === 'archive') {
            const widgetParent = new ParentWidget(id);
            const archive: Archive = file as Archive;
            archive.decodeArchiveFiles();
            const widgetChildFiles: FileData[] = Array.from(archive.files.values());
            widgetParent.children = new Array(widgetChildFiles.length);
            for(let i = 0; i < widgetChildFiles.length; i++) {
                widgetParent.children[i] = this.decodeWidgetFile(i, widgetChildFiles[i]);
            }

            return widgetParent;
        }
    }

    public decodeWidgetFile(id: number, widgetFile: FileData | Archive): WidgetBase {
        if(!widgetFile.content) {
            widgetFile.decompress();
        }

        const content = widgetFile.content;
        if(content[0] === -1) {
            return this.decodeWidgetFormat2(id, content);
        } else {
            return this.decodeWidgetFormat1(id, content);
        }
    }

    public createWidget(widgetType: number): WidgetBase {
        let widget: WidgetBase;

        if(widgetType === 0) {
            widget = new ContainerWidget();
        } else if(widgetType === 1) {
            widget = new TextWidget();
        } else if(widgetType === 2) {
            widget = new InteractableItemWidget();
        } else if(widgetType === 3) {
            widget = new RectangleWidget();
        } else if(widgetType === 4) {
            widget = new LinkWidget();
        } else if(widgetType === 5) {
            widget = new SpriteWidget();
        } else if(widgetType === 6) {
            widget = new ModelWidget();
        } else if(widgetType === 7) {
            widget = new StaticItemWidget();
        } else if(widgetType === 8) {
            widget = new TooltipWidget();
        } else if(widgetType === 9) {
            widget = new LineWidget();
        }

        return widget;
    }

    public decodeWidgetFormat2(widgetId: number, buffer: ByteBuffer): WidgetBase {
        buffer = new ByteBuffer(buffer);

        buffer.readerIndex = 1; // skip the first byte for the new format

        const widgetType = buffer.get('BYTE');
        const widget: WidgetBase = this.createWidget(widgetType);

        widget.id = widgetId;
        widget.format = 2;

        widget.contentType = buffer.get('SHORT', 'UNSIGNED');
        widget.originalX = buffer.get('SHORT');
        widget.originalY = buffer.get('SHORT');
        widget.width = buffer.get('SHORT', 'UNSIGNED');

        widget.x = widget.originalX;
        widget.y = widget.originalY;

        if(widget instanceof LineWidget) {
            widget.height = buffer.get('SHORT');
        } else {
            widget.height = buffer.get('SHORT', 'UNSIGNED');
        }

        widget.parentId = buffer.get('SHORT', 'UNSIGNED');
        if(widget.parentId === 0xffff) {
            widget.parentId = -1;
        }

        widget.hidden = buffer.get('BYTE', 'UNSIGNED') === 1;
        widget.hasListeners = buffer.get('BYTE', 'UNSIGNED') === 1;

        if(widget instanceof ContainerWidget) {
            widget.scrollWidth = buffer.get('SHORT', 'UNSIGNED');
            widget.scrollPosition = buffer.get('SHORT', 'UNSIGNED');
        }

        if(widget instanceof SpriteWidget) {
            widget.spriteId = buffer.get('INT');
            widget.textureId = buffer.get('SHORT', 'UNSIGNED');
            widget.tiled = buffer.get('BYTE', 'UNSIGNED') === 1;
            widget.opacity = buffer.get('BYTE', 'UNSIGNED');
        }

        if(widget instanceof ModelWidget) {
            widget.modelType = 1;
            widget.modelId = buffer.get('SHORT', 'UNSIGNED');
            widget.offsetX = buffer.get('SHORT');
            widget.offsetY = buffer.get('SHORT');
            widget.rotationX = buffer.get('SHORT', 'UNSIGNED');
            widget.rotationZ = buffer.get('SHORT', 'UNSIGNED');
            widget.rotationY = buffer.get('SHORT', 'UNSIGNED');
            widget.modelZoom = buffer.get('SHORT', 'UNSIGNED');
            widget.animation = buffer.get('SHORT', 'UNSIGNED');
            widget.orthogonal = buffer.get('BYTE', 'UNSIGNED') === 1;

            if(widget.animation === 65535) {
                widget.animation = -1;
            }
            
            if(widget.modelId === 65535) {
                widget.modelId = -1;
            }
        }

        if(widget instanceof LinkWidget) {
            widget.fontId = buffer.get('SHORT', 'UNSIGNED');
            widget.text = buffer.getString();
            widget.lineHeight = buffer.get('BYTE', 'UNSIGNED');
            widget.textAlignmentX = buffer.get('BYTE', 'UNSIGNED');
            widget.textAlignmentY = buffer.get('BYTE', 'UNSIGNED');
            widget.textShadowed = buffer.get('BYTE', 'UNSIGNED') == 1;
            widget.textColor = buffer.get('INT');
        }

        if(widget instanceof RectangleWidget) {
            widget.textColor = buffer.get('INT');
            widget.filled = buffer.get('BYTE', 'UNSIGNED') === 1;
            widget.opacity = buffer.get('BYTE', 'UNSIGNED');
        }

        if(widget instanceof LineWidget) {
            widget.lineWidth = buffer.get('BYTE', 'UNSIGNED');
            widget.textColor = buffer.get('INT');
        }

        if(widget.hasListeners) {
            // @TODO decode listeners
        }

        return widget;
    }

    public decodeWidgetFormat1(widgetId: number, buffer: ByteBuffer): WidgetBase {
        buffer = new ByteBuffer(buffer);

        const widgetType = buffer.get('BYTE');
        const widget: WidgetBase = this.createWidget(widgetType);

        widget.id = widgetId;
        widget.format = 1;

        widget.menuType = buffer.get('BYTE', 'UNSIGNED');
        widget.contentType = buffer.get('SHORT', 'UNSIGNED');
        widget.originalX = buffer.get('SHORT');
        widget.originalY = buffer.get('SHORT');
        widget.width = buffer.get('SHORT', 'UNSIGNED');
        widget.height = buffer.get('SHORT', 'UNSIGNED');
        widget.opacity = buffer.get('BYTE', 'UNSIGNED');
        widget.parentId = buffer.get('SHORT', 'UNSIGNED');
        widget.hoveredSiblingId = buffer.get('SHORT', 'UNSIGNED');

        widget.x = widget.originalX;
        widget.y = widget.originalY;

        if(widget.parentId === 0xffff) {
            widget.parentId = -1;
        }

        if(widget.hoveredSiblingId === 0xffff) { // 0xffff === 65535
            widget.hoveredSiblingId = -1;
        }

        const alternateCount = buffer.get('BYTE', 'UNSIGNED');

        if(alternateCount > 0) {
            widget.alternateOperators = new Array(alternateCount);
            widget.alternateRhs = new Array(alternateCount);
            for(let i = 0; alternateCount > i; i++) {
                widget.alternateOperators[i] = buffer.get('BYTE', 'UNSIGNED');
                widget.alternateRhs[i] = buffer.get('SHORT', 'UNSIGNED');
            }
        }

        const clientScriptCount = buffer.get('BYTE', 'UNSIGNED');

        if(clientScriptCount > 0) {
            widget.cs1 = new Array(clientScriptCount);

            for(let csIndex = 0; csIndex < clientScriptCount; csIndex++) {
                const k = buffer.get('SHORT', 'UNSIGNED');
                widget.cs1[csIndex] = new Array(k);

                for(let j = 0; k > j; j++) {
                    widget.cs1[csIndex][j] = buffer.get('SHORT', 'UNSIGNED');
                    if(widget.cs1[csIndex][j] === 65535) {
                        widget.cs1[csIndex][j] = -1;
                    }
                }
            }
        }

        if(widget instanceof ContainerWidget) {
            widget.scrollHeight = buffer.get('SHORT', 'UNSIGNED');
            widget.hidden = buffer.get('BYTE', 'UNSIGNED') === 1;
        }

        if(widget instanceof TextWidget) {
            buffer.get('SHORT', 'UNSIGNED'); // @TODO look into these at some point
            buffer.get('BYTE', 'UNSIGNED');
        }

        if(widget instanceof InteractableItemWidget) {
            widget.items = new Array(widget.height * widget.width);
            widget.itemAmounts = new Array(widget.height * widget.width);
            widget.itemSwapable = buffer.get('BYTE', 'UNSIGNED') === 1;
            widget.isInventory = buffer.get('BYTE', 'UNSIGNED') === 1;
            widget.itemUsable = buffer.get('BYTE', 'UNSIGNED') === 1;
            widget.itemDeletesDraged = buffer.get('BYTE', 'UNSIGNED') === 1;
            widget.itemSpritePadsX = buffer.get('BYTE', 'UNSIGNED');
            widget.itemSpritePadsY = buffer.get('BYTE', 'UNSIGNED');
            widget.imageX = new Array(20);
            widget.imageY = new Array(20);
            widget.images = new Array(20);

            for(let sprite = 0; sprite < 20; sprite++) {
                const hasSprite = buffer.get('BYTE', 'UNSIGNED');
                if(hasSprite === 1) {
                    widget.images[sprite] = buffer.get('SHORT');
                    widget.imageX[sprite] = buffer.get('SHORT');
                    widget.imageY[sprite] = buffer.get('INT');
                } else {
                    widget.imageY[sprite] = -1;
                }
            }

            widget.options = new Array(5);

            for(let i = 0; i < 5; i++) {
                widget.options[i] = buffer.getString();
                if(widget.options[i].length === 0) {
                    widget.options[i] = null;
                }
            }
        }

        if(widget instanceof RectangleWidget) {
            widget.filled = buffer.get('BYTE', 'UNSIGNED') === 1;
        }

        if(widget instanceof LinkWidget || widget instanceof TextWidget) {
            widget.textAlignmentX = buffer.get('BYTE', 'UNSIGNED');
            widget.textAlignmentY = buffer.get('BYTE', 'UNSIGNED');
            widget.lineHeight = buffer.get('BYTE', 'UNSIGNED');
            widget.fontId = buffer.get('SHORT', 'UNSIGNED');
            widget.textShadowed = buffer.get('BYTE', 'UNSIGNED') === 1;
        }

        if(widget instanceof LinkWidget) {
            widget.text = buffer.getString();
            widget.alternateText = buffer.getString();
        }

        if(widget instanceof TextWidget || widget instanceof RectangleWidget || widget instanceof LinkWidget) {
            widget.textColor = buffer.get('INT');
        }

        if(widget instanceof RectangleWidget || widget instanceof LinkWidget) {
            widget.alternateTextColor = buffer.get('INT');
            widget.hoveredTextColor = buffer.get('INT');
            widget.alternateHoveredTextColor = buffer.get('INT');
        }

        if(widget instanceof SpriteWidget) {
            widget.spriteId = buffer.get('INT');
            widget.alternateSpriteId = buffer.get('INT');
        }

        if(widget instanceof ModelWidget) {
            widget.modelType = 1;
            widget.alternateModelType = 1;
            widget.modelId = buffer.get('SHORT', 'UNSIGNED');
            widget.alternateModelId = buffer.get('SHORT', 'UNSIGNED');
            widget.animation = buffer.get('SHORT', 'UNSIGNED');
            widget.alternateAnimation = buffer.get('SHORT', 'UNSIGNED');
            widget.modelZoom = buffer.get('SHORT', 'UNSIGNED');
            widget.rotationX = buffer.get('SHORT', 'UNSIGNED');
            widget.rotationY = buffer.get('SHORT', 'UNSIGNED');

            if(widget.modelId === 0xffff) {
                widget.modelId = -1;
            }

            if(widget.alternateModelId === 0xffff) {
                widget.alternateModelId = -1;
            }

            if(widget.animation === 0xffff) {
                widget.animation = -1;
            }

            if(widget.alternateAnimation === 0xffff) {
                widget.alternateAnimation = -1;
            }
        }

        if(widget instanceof StaticItemWidget) {
            widget.items = new Array(widget.width * widget.height);
            widget.itemAmounts = new Array(widget.width * widget.height);
            widget.textAlignmentX = buffer.get('BYTE', 'UNSIGNED');
            widget.fontId = buffer.get('SHORT', 'UNSIGNED');
            widget.textShadowed = buffer.get('BYTE', 'UNSIGNED') == 1;
            widget.textColor = buffer.get('INT');
            widget.itemSpritePadsX = buffer.get('SHORT');
            widget.itemSpritePadsY = buffer.get('SHORT');
            widget.isInventory = buffer.get('BYTE', 'UNSIGNED') == 1;

            widget.options = new Array(5);

            for(let i = 0; i < 5; i++) {
                widget.options[i] = buffer.getString();
                if(widget.options[i].length === 0) {
                    widget.options[i] = null;
                }
            }
        }

        if(widget instanceof TooltipWidget) {
            widget.text = buffer.getString();
        }

        if(widget.menuType === 2 || widget instanceof InteractableItemWidget) {
            widget.targetVerb = buffer.getString();
            widget.spellName = buffer.getString();
            widget.clickMask = buffer.get('SHORT', 'UNSIGNED');
        }

        if(widget.menuType === 1 || widget.menuType === 4 || widget.menuType === 5 || widget.menuType === 6) {
            widget.hintText = buffer.getString();

            if(widget.hintText.length === 0) {
                if(widget.menuType === 1) {
                    widget.hintText = 'Ok';
                } else if(widget.menuType === 4 || widget.menuType === 5) {
                    widget.hintText = 'Select';
                } else if(widget.menuType === 6) {
                    widget.hintText = 'Continue';
                }
            }
        }

        return widget;
    }

    private decodeListener(buffer: ByteBuffer): any[] {
        const length = buffer.get('BYTE', 'UNSIGNED');
        if(length === 0) {
            return null;
        }

        const objects: any[] = new Array(length);

        for(let i = 0; i < length; i++) {
            const opcode = buffer.get('BYTE', 'UNSIGNED');
            if(opcode === 0) {
                objects[i] = buffer.get('INT');
            } else if(opcode === 1) {
                objects[i] = buffer.getString();
            }
        }

        return objects;
    }

}
