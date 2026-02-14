import {Trade} from "../services/storage/entities/Trade.ts";
import ChartIsland from "../islands/chart.tsx";
import {transparentize} from "$fresh_charts/utils.ts";

function countNumbers(numbers: number[]): { [key: string]: number } {
    let totalCount = numbers.length;
    let positives = 0;
    let negatives = 0;
    let zeros = 0;

    for (let number of numbers) {
        if (number > 0) {
            positives++;
        } else if (number < 0) {
            negatives++;
        } else {
            zeros++;
        }
    }

    let res = {
        "win": positives,
        "lose": negatives,
        "even": zeros
    };

    return res;
}


interface WinRatioProps {
    trades: Trade[];
}

export default function WinRatio({trades}: WinRatioProps) {

    const ratioMap = countNumbers(trades.map(t => t.PnL || 0))

    return (
        <>
            <ChartIsland
                type="doughnut"
                options={
                    {
                        plugins: {
                            title: {

                                display: true,
                                text: `Win Ratio ${(ratioMap["win"]/trades.length*100).toFixed(1)}%`,
                            }
                        },
                        interaction: {mode: "index", intersect: false}
                    }}
                data={{
                    labels: [`winners:${ratioMap["win"]}`, `losers:${ratioMap["lose"]}`,`even:${ratioMap["even"]}`],
                    datasets: [
                        {
                            label: `Win:${ratioMap["win"]} Lose:${ratioMap["lose"]} Even:${ratioMap["even"]}`,
                            data: [ratioMap["win"],ratioMap["lose"],ratioMap["even"]],
                            backgroundColor: [
                                transparentize('rgb(0, 220, 0)', 0.2),
                                transparentize('rgb(200, 0, 0)', 0.2),
                                transparentize('rgb(200, 200, 200)', 0.2),
                            ],
                            borderColor: [
                                transparentize('rgb(0, 220, 0)', 0.0),
                                transparentize('rgb(200, 0, 0)', 0.0),
                                transparentize('rgb(200, 200, 200)', 0.0),
                            ],
                            borderWidth: 2
                        },
                    ],
                }}
            />
        </>
    );
}