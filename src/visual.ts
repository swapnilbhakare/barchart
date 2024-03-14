"use strict";

import powerbi from "powerbi-visuals-api";
import { ITooltipServiceWrapper, createTooltipServiceWrapper, TooltipEventArgs } from "powerbi-visuals-utils-tooltiputils";
import debounce from 'lodash/debounce';


import "./../style/visual.less";



import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import ISelectionIdBuilder = powerbi.visuals.ISelectionIdBuilder;
import ISelectionId = powerbi.visuals.ISelectionId;
import ISelectionManager = powerbi.extensibility.ISelectionManager;

// import { Selector } from 'powerbi-visuals-api';

import {
    select,
    Selection,
    scaleBand,
    scaleLinear,
    max,
    axisBottom,
    axisLeft,

} from "d3";


// interface ISelectionManager {

//     select(selectionId: ISelectionId | ISelectionId[], multiSelect?: boolean): IPromise<ISelectionId[]>;

// }

// export interface ISelectionId {
//     equals(other: ISelectionId): boolean;
//     includes(other: ISelectionId, ignoreHighlight?: boolean): boolean;
//     getKey(): string;
//     getSelector(): Selector;
//     getSelectorsByColumn(): SelectorsByColumn;
//     hasIdentity(): boolean;
// }

export class Visual implements IVisual {
    private svg: Selection<SVGElement, any, any, any>;
    private barContainer: Selection<SVGElement, any, any, any>;
    private host: IVisualHost;
    private xAxisContainer: Selection<SVGGElement, any, any, any>;
    private yAxisContainer: Selection<SVGGElement, any, any, any>;
    private dropdownContainerX: HTMLSelectElement
    private dropdownContainerY: HTMLSelectElement
    private averageLineContainer: HTMLSelectElement
    private topNContainer: HTMLSelectElement
    private label: HTMLLabelElement
    private yLabel: HTMLLabelElement
    private x: any;
    private y: any;


    private selectionManager: ISelectionManager;
    private selectionIdBuilder: ISelectionIdBuilder;
    private height: number;
    private width: number;
    private tooltipServiceWrapper: ITooltipServiceWrapper;
    private showAverageLine: boolean = false;
    private legendContainer: Selection<SVGGElement, any, any, any>;
    private marginTop: number
    private marginRight: number
    private marginBottom: number
    private marginLeft: number

    constructor(options: VisualConstructorOptions) {


        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.selectionIdBuilder = this.host.createSelectionIdBuilder();

        // Call methods to create selections as needed

        // Create tooltip service wrapper
        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);

        //   X-axis dropdown
        this.label = document.createElement('label');
        this.label.textContent = "X : ";
        options.element.appendChild(this.label);
        this.dropdownContainerX = document.createElement('select');
        options.element.appendChild(this.dropdownContainerX);
        this.dropdownContainerX.style.marginRight = "10px";
        //  Y-axis dropdown
        this.label = document.createElement('label');
        this.label.textContent = "Y : ";
        options.element.appendChild(this.label);
        this.dropdownContainerY = document.createElement('select');
        options.element.appendChild(this.dropdownContainerY);
        this.dropdownContainerY.style.marginRight = "10px";

        // average Line


        this.label = document.createElement('label');
        this.label.textContent = "Average Line";
        options.element.appendChild(this.label);
        this.averageLineContainer = document.createElement('select');
        options.element.appendChild(this.averageLineContainer);
        this.averageLineContainer.style.marginRight = "10px";
        const averageLineOption = document.createElement("option");
        averageLineOption.value = "true";
        averageLineOption.text = "Hide";
        this.averageLineContainer.appendChild(averageLineOption);
        const noAverageLineOption = document.createElement("option");
        noAverageLineOption.value = "false";
        noAverageLineOption.text = "Show";
        this.averageLineContainer.appendChild(noAverageLineOption);


        //  dropdown for Top N

        this.label = document.createElement('label');
        this.label.textContent = "Top N : ";
        options.element.appendChild(this.label);
        this.topNContainer = document.createElement("select");
        options.element.appendChild(this.topNContainer);
        const topNOption = document.createElement("option")
        topNOption.value = "3"
        this.topNContainer.appendChild(topNOption);

        // Create SVG container
        this.svg = select(options.element).append("svg");

        // Append containers for chart elements
        this.barContainer = this.svg.append("g").classed("bar-container", true);
        this.xAxisContainer = this.svg.append("g").classed("x-axis", true);
        this.yAxisContainer = this.svg.append("g").classed("y-axis", true);

        // Append legend container
        this.legendContainer = this.svg.append("g").classed("legend", true);

        // // Bind event handlers
        this.handleMouseOver = this.handleMouseOver.bind(this);
        this.handleMouseOut = this.handleMouseOut.bind(this);
    }


    public update(options: VisualUpdateOptions) {
        this.initializeDimensions(options.viewport);
        const extractedData = this.populateData(options);
        const xAxisData = this.extractXAxisData(extractedData);
        const yAxisData = this.extractYAxisData(extractedData);

        this.populateDropdown(this.dropdownContainerX, xAxisData);
        this.populateDropdown(this.dropdownContainerY, yAxisData);

        this.initializeDropdownOptions();
        this.setupDropdownListeners(extractedData);

        this.handleMouseOver = this.handleMouseOver.bind(this);
        this.handleMouseOut = this.handleMouseOut.bind(this);

        this.initializeDropdownOptions();
        this.handleTopNSelection(extractedData);
    }

    private setupDropdownListeners(extractedData: any[]) {
        const renderChartWithData = () => {
            const selectedXAxis = this.dropdownContainerX.value;
            const selectedYAxis = this.dropdownContainerY.value;

            // Handle default option for X-axis
            let filteredDataX = extractedData;
            if (selectedXAxis) {
                filteredDataX = extractedData.filter(item => item.xAxis === selectedXAxis);
            }

            // Handle default option for Y-axis
            let filteredDataY = extractedData;
            if (selectedYAxis) {
                filteredDataY = extractedData.filter(item => item.yAxis === selectedYAxis);
            }
            const combinedData = this.combineData(filteredDataX, filteredDataY);

            this.renderChart(combinedData);
        };


        this.dropdownContainerX.addEventListener('change', renderChartWithData);
        this.dropdownContainerY.addEventListener('change', renderChartWithData);

        renderChartWithData();
    }





    private populateData(options: any) {
        const extractedData = [];
        if (
            options.dataViews &&
            options.dataViews[0] &&
            options.dataViews[0].categorical
        ) {
            const categorical = options.dataViews[0].categorical;
            const categoriesData = categorical.categories;
            const dataValueData = categorical.values;

            // Extract data for X-axis (categoriesData)
            categoriesData.forEach((categoryData: any) => {
                const category = categoryData.source.displayName;
                const categories = categoryData.values;
                categories.forEach((value: any) => {
                    extractedData.push({
                        xAxis: category, // X-axis
                        yAxis: null,    // No Y-axis for X-axis data
                        value: value

                    });
                });
            });

            // Extract data for Y-axis (dataValueData)
            dataValueData.forEach((data: any) => {
                const option = data.source.displayName;
                const values = data.values;
                values.forEach((value: any) => {
                    extractedData.push({
                        xAxis: null,    // No X-axis for Y-axis data
                        yAxis: option, // Y-axis
                        value: value
                    });
                });
            });


        }

        return extractedData;
    }

    private extractXAxisData(data: any[]): string[] {
        return [...new Set(data.filter(item => item.xAxis).map(item => item.xAxis))];
    }

    private extractYAxisData(data: any[]): string[] {
        return [...new Set(data.filter(item => item.yAxis).map(item => item.yAxis))];
    }
    private populateDropdown(container: HTMLSelectElement, data: string[]) {

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            container.appendChild(option);
        });
    }




    private initializeDropdownOptions() {
        // Clear existing options
        this.topNContainer.innerHTML = '';

        // Add options to the top N dropdown
        const topNOptions = [3, 5];
        topNOptions.forEach(option => {
            const topNOption = document.createElement('option');
            topNOption.value = option.toString();
            topNOption.textContent = `${option}`;
            this.topNContainer.appendChild(topNOption);
        });


    }
    private handleTopNSelection(extractedData: any[]) {
        this.topNContainer.addEventListener('change', () => {
            const selectedXAxis = this.dropdownContainerX.value;
            const selectedYAxis = this.dropdownContainerY.value;

            let filteredDataX;
            if (selectedXAxis) {
                filteredDataX = extractedData.filter(item => item.xAxis === selectedXAxis);
            } else {
                filteredDataX = extractedData; // Include all data if no X-axis selection is made
            }

            let filteredDataY = [];
            if (selectedYAxis) {
                filteredDataY = extractedData.filter(item => item.yAxis === selectedYAxis);
            }

            const topN = parseInt(this.topNContainer.value);
            let topNData = [];

            // Sort filtered data based on Y-axis values
            const sortedData = filteredDataY.slice().sort((a, b) => b.value - a.value);

            // Select the top N values
            topNData = sortedData.slice(0, topN);

            this.renderChart(topNData); // Render chart with top N Y-axis values and all X-axis values
            this.renderLegend(filteredDataX); // Update legend with X-axis values
        });
    }



    private initializeDimensions(viewport: powerbi.IViewport) {
        this.width = viewport.width;
        this.height = viewport.height;
        this.marginTop = 20;
        this.marginRight = 20;
        this.marginBottom = 40;
        this.marginLeft = 40;
    }
    private combineData(filteredDataX: any[], filteredDataY: any[]): any[] {
        const combinedData = [];

        const minLength = Math.min(filteredDataX.length, filteredDataY.length);
        for (let i = 0; i < minLength; i++) {
            combinedData.push({
                category: filteredDataX[i].value, // Assuming 'value' is the property you want
                xAxis: filteredDataX[i].xAxis,
                yAxis: filteredDataY[i] ? filteredDataY[i].yAxis : null,
                value: filteredDataY[i] ? filteredDataY[i].value as number : null // Add proper type annotation
            });
        }

        return combinedData;
    }




    private renderChart(data: any) {


        this.renderLegend(data)
        this.initializeDropdownOptions()



        this.x = scaleBand()
            .domain(data.map((data: any) => data.category))
            .rangeRound([this.marginLeft, this.width - this.marginRight])
            .padding(0.1);

        this.y = scaleLinear()
            .domain([0, max(data as any[], (dataPoint) => Number(dataPoint.value))])
            .range([this.height - this.marginBottom, this.marginTop]);


        const xAxis = axisBottom(this.x);
        const yAxis = axisLeft(this.y);




        this.xAxisContainer
            .call(xAxis)
            .attr("transform", `translate(0,${this.height - this.marginBottom})`);

        this.yAxisContainer
            .call(yAxis)
            .attr("transform", `translate(${this.marginLeft},0)`);

        this.svg.attr("width", this.width).attr("height", this.height);





        const bars = this.barContainer.selectAll(".bar").data(data);

        const barText = this.barContainer.selectAll(".bar-text").data(data);
        barText.enter()
            .append("text")
            .classed("bar-text", true)
            .attr("text-anchor", "middle")
            .attr("x", (dataPoint: any) => this.x(dataPoint.category) + this.x.bandwidth() / 2)
            .attr("y", (dataPoint: any) => this.y((dataPoint).value) - 5)
            .text((dataPoint: any) => (dataPoint).value);

        barText
            .attr("x", (dataPoint: any) => this.x(dataPoint.category) + this.x.bandwidth() / 2) // Corrected typo here
            .attr("y", (dataPoint: any) => this.y(dataPoint.value) - 5)
            .text((dataPoint: any) => dataPoint.value);

        barText.exit().remove();

        bars.enter()
            .append("rect")
            .classed("bar", true)
            .attr("width", this.x.bandwidth())
            .attr("height", (dataPoint: any) => this.height - this.marginBottom - this.y(dataPoint.value))
            .attr("x", (dataPoint: any) => this.x(dataPoint.category) + this.x.bandwidth() / 10)
            .attr("y", (dataPoint: any) => this.y(dataPoint.value))
            .attr("fill", (dataPoint: any) => this.host.colorPalette.getColor(dataPoint.category).value)
            .on('mouseover', this.handleMouseOver)
            .on('mouseout', this.handleMouseOut)
            .attr("data-category", (dataPoint: any) => dataPoint.category)
            .on("click", (dataPoint: any, mouseEvent) => {
                const multiSelect = (mouseEvent as MouseEvent).ctrlKey;
                this.selectionManager.select(dataPoint.category, multiSelect);
                // this.selectionManager.select(ataPoindt.category);
            });

        bars
            .attr("width", this.x.bandwidth())
            .attr("height", (dataPoint: any) => this.height - this.marginBottom - this.y(dataPoint.value))
            .attr("x", (dataPoint: any) => this.x(dataPoint.category) + this.x.bandwidth() / 10)
            .attr("y", (dataPoint: any) => this.y(dataPoint.value))
            .attr("fill", (dataPoint: any) => this.host.colorPalette.getColor(dataPoint.category).value)


        bars.exit().remove();

        this.svg.selectAll(".average-line").remove();
        this.averageLineContainer.addEventListener('change', () => {
            this.showAverageLine = this.averageLineContainer.value === "false";
            this.toggleAverageLineVisibility(data);
        });


    }



    private handleBarSelection(dataPoint: any) {

        this.selectionManager.clear();

        console.log('datapoint', dataPoint)

        this.barContainer.selectAll(".bar")
            .attr("fill", (d: any) => this.host.colorPalette.getColor(d.category).value)
            .attr("opacity", 1);
        const selectedBar = this.barContainer.select(`[data-category="${dataPoint.category}"]`);
        selectedBar
            .attr("fill", (d: any) => this.host.colorPalette.getColor(d.category).value)
            .attr("opacity", 1);

        this.barContainer.selectAll(".bar")
            .filter((d: any) => d.category !== dataPoint.category)
            .attr("fill", (d: any) => this.host.colorPalette.getColor(d.category).value)
            .attr("opacity", 0.5);

        // const selectionId = this.createSelectionId(dataPoint);


        console.log("selectedIds", this.selectionManager.getSelectionIds());

        console.log(this.selectionManager)
        // this.selectionManager.select(selectionId, true);

        // this.selectionManager.applySelectionFilter({ selectionId });



    }



    private handleMouseOver = debounce((event: MouseEvent, dataPoint: any) => {
        const targetElement = event.target as SVGElement;
        this.tooltipServiceWrapper.addTooltip(
            select(targetElement),
            (tooltipEvent: TooltipEventArgs<number>) => {
                return [
                    {
                        displayName: dataPoint.category,
                        value: dataPoint.value.toString(),
                        color: this.host.colorPalette.getColor(dataPoint.category).value,

                    }
                ];
            }
        );
    }, 300);

    private handleMouseOut = (event: MouseEvent) => {

        const targetElement = event.target as HTMLElement;

        select(targetElement).select('.tooltip').remove();
    }




    private renderLegend = (data: any[]) => {

        const legends = data.map((data) => data.category)

        const legendWidth = 900;
        const legendItemWidth = 100;
        const spacing = 50;
        const legendHeight = legends.length * 50;
        this.legendContainer.selectAll(".legend-item").remove();
        const legend = this.legendContainer.selectAll(".legend-item")
            .data(legends);

        const legendEnter = legend.enter().append('g')
            .classed('legend-item', true)
            .attr("transform", (d, i) => `translate(${this.width - legendWidth + i * (legendItemWidth + spacing)}, 10)`); // Adjust the y-coordinate to position the legend at the top

        legendEnter.append('rect')
            .attr('width', 20)
            .attr('height', 20)
            .attr('rx', 10)
            .attr('ry', 10)
            .attr("fill", (d: string) => this.host.colorPalette.getColor(d).value);

        legendEnter.append("text")
            .attr("x", 30)
            .attr("y", 14)
            .text(d => String(d))


        legend.exit().remove();
    }

    private calculateAverage(data: any[]): number {

        const sum = data.reduce((acc, cur) => acc + cur.value, 0);
        return sum / data.length;
    }

    private toggleAverageLineVisibility(data: any[]) {
        if (this.showAverageLine) {
            // Show average line
            const average = this.calculateAverage(data);
            this.svg.selectAll(".average-line").remove();
            this.svg.append("line")
                .classed("average-line", true)
                .attr("x1", this.marginLeft)
                .attr("y1", this.y(average))
                .attr("x2", this.width - this.marginRight)
                .attr("y2", this.y(average))
                .attr("stroke", 'black')
                .attr("stroke-width", 2)
                .attr("stroke-line", "5,5");
        } else {
            // Hide average line
            this.svg.selectAll(".average-line").remove();
        }
    }



}


