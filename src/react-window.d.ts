declare module 'react-window' {
    import { ComponentType, CSSProperties, Ref } from 'react';

    export interface ListOnScrollProps {
        scrollDirection: 'forward' | 'backward';
        scrollOffset: number;
        scrollUpdateWasRequested: boolean;
    }

    export interface ListProps {
        children: ComponentType<any>;
        className?: string;
        direction?: 'ltr' | 'rtl' | 'horizontal' | 'vertical';
        height: number | string;
        initialScrollOffset?: number;
        innerElementType?: string | ComponentType<any>;
        innerRef?: Ref<any>;
        innerTagName?: string; // deprecated
        itemCount: number;
        itemData?: any;
        itemKey?: (index: number, data: any) => any;
        itemSize: number | ((index: number) => number);
        layout?: 'vertical' | 'horizontal';
        onItemsRendered?: (props: {
            overscanStartIndex: number;
            overscanStopIndex: number;
            visibleStartIndex: number;
            visibleStopIndex: number;
        }) => void;
        onScroll?: (props: ListOnScrollProps) => void;
        outerElementType?: string | ComponentType<any>;
        outerRef?: Ref<any>;
        outerTagName?: string; // deprecated
        overscanCount?: number;
        style?: CSSProperties;
        useIsScrolling?: boolean;
        width: number | string;
    }

    export class FixedSizeList extends React.Component<ListProps> { }
    export class VariableSizeList extends React.Component<ListProps> { }

    export function areEqual(prev: any, next: any): boolean;
}
