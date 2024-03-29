import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
export declare class Visual implements IVisual {
    private svg;
    private barContainer;
    private host;
    private xAxisContainer;
    private yAxisContainer;
    private dropdownContainerX;
    private dropdownContainerY;
    private averageLineContainer;
    private topNContainer;
    private label;
    private yLabel;
    private x;
    private y;
    private selectionManager;
    private selectionIdBuilder;
    private height;
    private width;
    private tooltipServiceWrapper;
    private showAverageLine;
    private legendContainer;
    private marginTop;
    private marginRight;
    private marginBottom;
    private marginLeft;
    constructor(options: VisualConstructorOptions);
    update(options: VisualUpdateOptions): void;
    private setupDropdownListeners;
    private populateData;
    private extractXAxisData;
    private extractYAxisData;
    private populateDropdown;
    private initializeDropdownOptions;
    private handleTopNSelection;
    private initializeDimensions;
    private combineData;
    private renderChart;
    private handleBarSelection;
    private handleMouseOver;
    private handleMouseOut;
    private renderLegend;
    private calculateAverage;
    private toggleAverageLineVisibility;
}
