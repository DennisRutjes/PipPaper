import {Trade} from "../services/storage/entities/Trade.ts";
import NetCumulativePnL from "./NetCumulativePnL.tsx";
import WinRatio from "./WinRatio.tsx";
import NetDailyPnL from "./NetDailyPnL.tsx";

interface TradeLogDashboardProps {
    trades: Trade[];
}

export default function TradeLogDashboard({trades}: TradeLogDashboardProps) {
    return (
        <table className="border-4">
            <tr>
                <td className="w-6/12">
                    <NetCumulativePnL trades={trades}/>
                </td>
                <td className="w-1/12">
                    <WinRatio trades={trades}/>
                </td>
                <td className="w-5/12">
                    <NetDailyPnL trades={trades}/>
                </td>
            </tr>
        </table>
    );
}
