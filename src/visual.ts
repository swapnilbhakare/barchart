"use strict";

import powerbi from "powerbi-visuals-api";
import { ITooltipServiceWrapper, createTooltipServiceWrapper, TooltipEventArgs } from "powerbi-visuals-utils-tooltiputils";


import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import {
    select,
    Selection,
    scaleBand,
    scaleLinear,
    max,
    axisBottom,
    axisLeft,
} from "d3";



export class Visual implements IVisual {
    private svg: Selection<SVGElement, any, any, any>;
    private barContainer: Selection<SVGElement, any, any, any>;
    private host: IVisualHost;
    private xAxisContainer: Selection<SVGGElement, any, any, any>;
    private yAxisContainer: Selection<SVGGElement, any, any, any>;
    private dropdownContainer: HTMLSelectElement
    private dropdownContainerY: HTMLSelectElement
    private topNContainer: HTMLSelectElement
    private label: HTMLLabelElement
    private yLabel: HTMLLabelElement
    private x: any;
    private y: any;
    private height: number;
    private width: number;
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    private legendContainer: Selection<SVGGElement, any, any, any>;

    private marginTop: number
    private marginRight: number
    private marginBottom: number
    private marginLeft: number

    constructor(options: VisualConstructorOptions) {
        // x axis 
        this.host = options.host;
        // Create tooltip service wrapper
        this.tooltipServiceWrapper = createTooltipServiceWrapper(this.host.tooltipService, options.element);

        // Append label for X-axis dropdown
        this.label = document.createElement('label');
        this.label.textContent = "X : ";
        options.element.appendChild(this.label);

        // Append dropdown for X-axis
        this.dropdownContainer = document.createElement('select');
        options.element.appendChild(this.dropdownContainer);
        this.dropdownContainer.style.marginRight = "10px";
        // Append label for Y-axis dropdown
        this.label = document.createElement('label');
        this.label.textContent = "Y : ";
        options.element.appendChild(this.label);

        // Append dropdown for Y-axis
        this.dropdownContainerY = document.createElement('select');
        options.element.appendChild(this.dropdownContainerY);
        this.dropdownContainerY.style.marginRight = "10px";
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


        const extractedData = [];
        extractedData.length = 0;

        this.initializeDimensions(options.viewport);

        if (
            options.dataViews &&
            options.dataViews[0] &&
            options.dataViews[0].categorical
        ) {
            const categoricalData = options.dataViews[0].categorical;
            const category = categoricalData.categories[0];
            const dataValue = categoricalData.values[0];

            for (const value of category.values) {
                extractedData.push({
                    category: value,
                    value: dataValue.values[category.values.indexOf(value)],
                    color: this.host.colorPalette.getColor(value as string).value,
                });
            }

        }
        this.renderLegend(extractedData);
        this.renderChart(extractedData);
        while (this.dropdownContainer.firstChild) {
            this.dropdownContainer.removeChild(this.dropdownContainer.firstChild);
        }
        console.log(extractedData)

        if (
            options.dataViews &&
            options.dataViews[0] &&
            options.dataViews[0].categorical
        ) {
            const categoricalData = options.dataViews[0].categorical;
            const categories = categoricalData.categories;
            const dataValue = categoricalData.values[0];

            for (const category of categories) {
                const values = category.values;
                const option = document.createElement('option');

                option.value = category.source.displayName;
                option.text = category.source.displayName;
                this.dropdownContainer.appendChild(option);
                for (const value of values) {
                    option.value.toLocaleLowerCase(),

                        extractedData.push({
                            option: option.value.toLocaleLowerCase(),
                            category: value,
                            value: dataValue.values[values.indexOf(value)],
                            color: this.host.colorPalette.getColor(value as string).value,
                        });
                }
            }


        }
        this.dropdownContainer.addEventListener('change', () => {
            const selectedCategory: string = this.dropdownContainer.value.toLowerCase();
            const filteredData = extractedData.filter(item => item.option === selectedCategory);

            this.renderChart(filteredData);
            this.renderLegend(filteredData);
        });



        while (this.dropdownContainerY.firstChild) {
            this.dropdownContainerY.removeChild(this.dropdownContainerY.firstChild);

        }

        if (
            options.dataViews &&
            options.dataViews[0] &&
            options.dataViews[0].categorical
        ) {
            const categoricalData = options.dataViews[0].categorical;
            const dataValues = categoricalData.values;

            for (const dataValue of dataValues) {
                const option = document.createElement('option');
                option.value = dataValue.source.displayName;
                option.text = dataValue.source.displayName;
                this.dropdownContainerY.appendChild(option);
                const values = dataValue.values;
                for (const value of values) {

                    extractedData.push({
                        option: option.value.toLocaleLowerCase(),
                        category: value,
                        value: dataValue.values[values.indexOf(value)],
                        color: this.host.colorPalette.getColor(value as string).value,

                    });
                }





            }


        }
        this.dropdownContainerY.addEventListener('change', () => {
            const selectedYCategory: string = this.dropdownContainerY.value.toLowerCase();

            const filteredData = extractedData.filter(item => item.option === selectedYCategory);
            console.log(filteredData)
            this.renderChart(filteredData);

            this.renderLegend(filteredData);
        });



        this.handleMouseOver = this.handleMouseOver.bind(this);
        this.handleMouseOut = this.handleMouseOut.bind(this);
        this.initializeDropdownOptions();
        this.handleTopNSelection(extractedData);

    }


    private initializeDropdownOptions() {
        // Clear existing options
        this.topNContainer.innerHTML = '';

        // Add options to the top N dropdown
        const topNOptions = [3, 5, 6];
        topNOptions.forEach(option => {
            const topNOption = document.createElement('option');
            topNOption.value = option.toString();
            topNOption.textContent = `${option}`;
            this.topNContainer.appendChild(topNOption);
        });

        // Add other dropdown options if needed
    }
    private handleTopNSelection(extractedData: any[]) {
        // Handle changes in Top N dropdown
        this.topNContainer.addEventListener('change', () => {
            const topN = parseInt(this.topNContainer.value);
            const sortedData = extractedData.sort((a, b) => b.value - a.value);
            const topNData = sortedData.slice(0, topN);
            this.renderChart(topNData);
            this.renderLegend(topNData);
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



    private renderChart(data: any[]) {

        const x = scaleBand()
            .domain(data.map(dataPoint => dataPoint.category))
            .rangeRound([this.marginLeft, this.width - this.marginRight])
            .padding(0.1);

        const y = scaleLinear()
            .domain([0, max(data, dataPoint => dataPoint.value) + 2])
            .range([this.height - this.marginBottom, this.marginTop]);

        const xAxis = axisBottom(x);
        const yAxis = axisLeft(y);

        this.xAxisContainer
            .call(xAxis)
            .attr("transform", `translate(0,${this.height - this.marginBottom})`);

        this.yAxisContainer
            .call(yAxis)
            .attr("transform", `translate(${this.marginLeft},0)`);

        this.svg.attr("width", this.width).attr("height", this.height);



        this.svg.selectAll(".average-line").remove();


        const average = data.reduce((acc, cur) => acc + cur.value, 0) / data.length;
        this.svg.append("line")
            .classed("average-line", true)
            .attr("x1", this.marginLeft)
            .attr("y1", y(average))
            .attr("x2", this.width - this.marginRight)
            .attr("y2", y(average))
            .attr("stroke", 'black')
            .attr("stroke-width", 2)
            .attr("stroke-line", "5,5");




        const bars = this.barContainer.selectAll(".bar").data(data);

        bars.enter()
            .append("rect")
            .classed("bar", true)
            .attr("width", x.bandwidth())
            .attr("height", dataPoint => this.height - this.marginBottom - y(dataPoint.value))
            .attr("x", dataPoint => x(dataPoint.category))
            .attr("y", dataPoint => y(dataPoint.value))
            .attr("fill", dataPoint => this.host.colorPalette.getColor(dataPoint.category).value) // Use host color palette
            .on('mouseover', this.handleMouseOver)
            .on('mouseout', this.handleMouseOut);

        bars
            .attr("width", x.bandwidth())
            .attr("height", dataPoint => this.height - this.marginBottom - y(dataPoint.value))
            .attr("x", dataPoint => x(dataPoint.category))
            .attr("y", dataPoint => y(dataPoint.value))
            .attr("fill", dataPoint => this.host.colorPalette.getColor(dataPoint.category).value); // Use host color palette

        bars.exit().remove();
    }



    private handleMouseOver = (event: MouseEvent, dataPoint: any) => {
        const targetElement = event.target as SVGElement;
        console.log('mouse in')

        this.tooltipServiceWrapper.addTooltip(
            select(targetElement),
            (tooltipEvent: TooltipEventArgs<number>) => {
                return [
                    {
                        displayName: dataPoint.category,
                        value: dataPoint.value.toString(),
                        color: this.host.colorPalette.getColor(dataPoint.category).value,
                        header: dataPoint.option
                    }
                ];
            }
        );
    }

    private handleMouseOut = (event: MouseEvent) => {

        const targetElement = event.target as HTMLElement;

        select(targetElement).select('.tooltip').remove();
    }




    private renderLegend = (data: any[]) => {
        const categories = [...new Set(data.map((d: any) => d.category))];
        const legendWidth = 900;
        const legendItemWidth = 100;
        const spacing = 50;
        const legendHeight = categories.length * 50;
        this.legendContainer.selectAll(".legend-item").remove();

        const legend = this.legendContainer.selectAll(".legend-item")
            .data(categories);

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
            .text(d => String(d));

        legend.exit().remove();
    }








}

