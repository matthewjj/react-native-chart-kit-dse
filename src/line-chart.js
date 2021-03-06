import React from 'react'
import { View } from 'react-native'
import {
  Svg,
  Circle,
  Polygon,
  Polyline,
  Path,
  Rect,
  G,
  Text,
  Tspan
} from 'react-native-svg'
import AbstractChart from './abstract-chart'
import Points from './points/points';

class LineChart extends AbstractChart {

  dataRefinedCache = [];

  dataRefined = data => {
    
    let combinedArray = [];
    data.map((dataset,index)=>{
      
      let dataRefined = [];

      let isData = false;

      let nullGaps = {};
      let start = null;
      let end = null;

      let started = false;
      
      let nullStartVal = null;
      let nullEndVal = null;

      let nullStartPos = null;
      let nullEndPos = null;

      for(i = 0; i< dataset.data.length; i++) {

          if(dataset.data[i] === null && started && nullStartVal === null) {
            nullStartVal = dataset.data[i - 1];
            nullStartPos = i - 1;
           
          }
      
          if(dataset.data[i] !== null && started && nullStartVal !== null) {
            nullEndVal = dataset.data[i];
            nullEndPos = i;

          }

          //moving backwards find the end
          if(dataset.data[dataset.data.length - i - 1] !== null && end === null) {
            end =  dataset.data.length - i;

          }

          if(dataset.data[i] !== null && start === null) {
            start = i;
            started = true;

          }
          
          dataRefined.push(dataset.data[i]);
          
          if(nullStartVal !== null && nullEndVal !== null) {
            for(var ii = nullStartPos + 1; ii < nullEndPos; ii++) {
              if(nullEndVal > nullStartVal) {
                dataRefined[ii] = nullStartVal + (((nullEndVal - nullStartVal) / ( nullEndPos - nullStartPos)) * (ii - nullStartPos));
              
              }
              else {
                dataRefined[ii] = nullStartVal - (((nullStartVal - nullEndVal) / ( nullEndPos - nullStartPos)) * (ii - nullStartPos));
              }
              
            }

            nullGaps[nullStartPos] = {
                startVal : nullStartVal, 
                endVal: nullEndVal,
                startPos: nullStartPos,
                endPos: nullEndPos
            };
            
            nullStartVal = null;
            nullEndVal = null;

          }

      }

      combinedArray.push({
        nullGaps: nullGaps,
        start: start,
        end: end,
        data: dataRefined,
        color: dataset.color,
        hasData: started
      })

    });

    
    
    return combinedArray;

  }

  renderLine = config => {

    if (this.props.bezier) {
      return this.renderBezierLine(config)
    }
    const { width, height, paddingRight, paddingTop, data} = config
    let output = [];

    var dataRefined = this.dataRefined(data);
    this.dataRefinedCache = dataRefined;

    var min = this.getMinValue();
    var range = this.getMaximumRange();
    var yAxisLabels = this.yAxisLabels(range, min);
    var yAxisRange = this.calcYAxisRange(yAxisLabels);
    var offset = this.getNegativeOffset();
    
    var count = yAxisLabels.length;

    dataRefined.map((dataset, index) => {

      for (var i = 0; i < dataset.data.length; i++) {
        if(dataset.data[i+1] == undefined) {
          continue;
        }

        if(i < dataset.start || i >= dataset.end - 1) {
          continue;
        }
        
        let value1 = dataset.data[i];
        let value2 = dataset.data[i+1];

        let baseLine = (height / count * (count - 1)) + paddingTop;
        
        let x1 = baseLine - (height / count * ( ((count - 1) / yAxisRange) * (value1 + offset))) ;
        let y1 = paddingRight + (i * (width - paddingRight) / dataset.data.length);

        let x2 = baseLine - (height / count * ( ((count - 1) / yAxisRange) * (value2 + offset))) ;
        let y2 = paddingRight + ((i+1) * (width - paddingRight) / dataset.data.length);
        
        output.push (
          <Polyline
            key = {index+"-"+i}
            points={y1+","+x1+' '+y2+","+x2}
            fill="none"
            stroke={
              dataset.color ? 
                dataset.color : 
                this.props.chartConfig.color(
                  i < dataRefined.start || i >= dataRefined.end - 1 ? 
                  0 : 0.2
                )
            }
            strokeWidth="3"
          />
        )

     }

    })

    return (
      output
    )
    
  }


  renderDots = config => {
    
      var min = this.getMinValue();
      var offset = this.getNegativeOffset();
      var range = this.getMaximumRange();

      var yAxisLabels = this.yAxisLabels(range, min);
      var yAxisRange = this.calcYAxisRange(yAxisLabels);
    
    return (
      <Points
        config={config}
        min={min}
        offset={offset}
        range={range}
        yAxisLabels={yAxisLabels}
        yAxisRange={yAxisRange}
        dataRefinedCache={this.dataRefinedCache}
        chartConfig={this.props.chartConfig}
      />
    )

  }

  renderShadow = config => {
    if (this.props.bezier) {
      return this.renderBezierShadow(config)
    }
    const { data, width, height, paddingRight, paddingTop } = config
    let output = [];
    config.data.map((dataset,index)=>{
      output.push (
        <Polygon
          key={index}
          points={dataset.data.map((x, i) =>
            (paddingRight + (i * (width - paddingRight) / dataset.data.length)) +
          ',' +
           (((height / 4 * 3 * (1 - ((x - Math.min(...dataset.data)) / this.getMaximumRange()))) + paddingTop))
          ).join(' ') + ` ${paddingRight + ((width - paddingRight) / dataset.data.length * (dataset.data.length - 1))},${(height / 4 * 3) + paddingTop} ${paddingRight},${(height / 4 * 3) + paddingTop}`}
          fill="url(#fillShadowGradient)"
          strokeWidth="0"
        />)
    })
    return (
      output
    )
    
    
  }

  getBezierLinePoints = (dataset, config) => {

    const { width, height, paddingRight, paddingTop, data } = config
    let output = []; 
    if (dataset.data.length === 0) {
      return 'M0,0'
    }
    const x = i => Math.floor(paddingRight + i * (width - paddingRight) / dataset.data.length)
    const y = i => Math.floor(((height / 4 * 3 * (1 - ((dataset.data[i] - Math.min(...dataset.data)) / this.getMaximumRange()))) + paddingTop))
    
    return [`M${x(0)},${y(0)}`].concat(dataset.data.slice(0, -1).map((_, i) => {
      const x_mid = (x(i) + x(i + 1)) / 2
      const y_mid = (y(i) + y(i + 1)) / 2
      const cp_x1 = (x_mid + x(i)) / 2
      const cp_x2 = (x_mid + x(i + 1)) / 2
      return `Q ${cp_x1}, ${y(i)}, ${x_mid}, ${y_mid}` +
      ` Q ${cp_x2}, ${y(i + 1)}, ${x(i + 1)}, ${y(i + 1)}`
    })).join(' ')

    
  }

  renderBezierLine = config => {
    let output = [];
    config.data.map((dataset,index)=>{
      let result = this.getBezierLinePoints(dataset,config);
      output.push (
          <Path
            key = {index}
            d={result}
            fill="none"
            stroke={this.props.chartConfig.color(0.2)}
            strokeWidth="3"
          />
        )
      });
    return (
      output
    )

  }

  renderBezierShadow = config => {
    const { width, height, paddingRight, paddingTop, data } = config
    let output = [];
    data.map((dataset,index)=>{
      let d = this.getBezierLinePoints(dataset,config) +
      ` L${paddingRight + ((width - paddingRight) / dataset.data.length * (dataset.data.length - 1))},${(height / 4 * 3) + paddingTop} L${paddingRight},${(height / 4 * 3) + paddingTop} Z`
      output.push (
        <Path
          key={index}
          d={d}
          fill="url(#fillShadowGradient)"
          strokeWidth="0"
        />)
    })
    return (
      output
    )
    
  }


  render() {
    const paddingTop = 4
    const paddingRight = 64
    const { width, height, data, withShadow = true, withDots = true, style = {} } = this.props
    const { labels = [] } = data
    const { borderRadius = 0 } = style
    const config = {
      width,
      height
    }
    
    this.setStats(data.datasets);
    
    const range = this.getMaximumRange();
    const min = this.getMinValue();
    
    return (
      <View style={style}>
        <Svg
          height={height}
          width={width}
          strokeWidth="1"
        >
          <G strokeWidth="1">
            {this.renderDefs({
              ...config,
              ...this.props.chartConfig
            })}
            <Rect
              x="0"
              y="0"
              width="100%"
              height={height.toString()}
              rx={borderRadius.toString()}
              ry={borderRadius.toString()}
              fill="url(#backgroundGradient)"
              strokeWidth="1"
            
            />
            {this.renderHorizontalLines({
              ...config,
              count: 4,
              paddingTop,
              paddingRight,
              data: data.datasets[0].data,
            })}
            {this.renderHorizontalLabels({
              ...config,
              count: (Math.min(...data.datasets[0].data) === Math.max(...data.datasets[0].data)) ?
                1 : 4,
              data: data.datasets[0].data,
              paddingTop,
              paddingRight
            })}
            {this.renderVerticalLines({
              ...config,
              data: data.datasets[0].data,
              paddingTop,
              paddingRight
            })}
            {this.renderVerticalLabels({
              ...config,
              count: 4,
              data: data.datasets[0].data,
              labels,
              paddingRight,
              paddingTop
            })}
            {this.renderLine({
              ...config,
              paddingRight,
              paddingTop,
              data: data.datasets

            })}
            {withShadow && this.renderShadow({
              ...config,
              data: data.datasets,
              paddingRight,
              paddingTop
            })}
            {withDots && this.renderDots({
              ...config,
              count: 4,
              data: data.datasets,
              labels,
              paddingTop,
              paddingRight
            })}
            
          </G>
        </Svg>
      </View>
    )
  }
}

export default LineChart
