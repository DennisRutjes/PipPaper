import { JSX } from "preact";
import { IS_BROWSER } from "$fresh/runtime.ts";
import {MenuProps} from "../islands/SideMenu.tsx";

interface DateProps {
  date_in_epoch_ms: number;
}

function padTwoDigits(num: number) {
  return num.toString().padStart(2, "0");
}

function dateInYyyyMmDdHhMmSs(date: Date, dateDivider: string = "-") {
  // :::: Exmple Usage ::::
  // The function takes a Date object as a parameter and formats the date as YYYY-MM-DD hh:mm:ss.
  // 👇️ 2023-04-11 16:21:23 (yyyy-mm-dd hh:mm:ss)
  //console.log(dateInYyyyMmDdHhMmSs(new Date()));

  //  👇️️ 2025-05-04 05:24:07 (yyyy-mm-dd hh:mm:ss)
  // console.log(dateInYyyyMmDdHhMmSs(new Date('May 04, 2025 05:24:07')));
  // Date divider
  // 👇️ 01/04/2023 10:20:07 (MM/DD/YYYY hh:mm:ss)
  // console.log(dateInYyyyMmDdHhMmSs(new Date(), "/"));
  return (
      [
        date.getFullYear(),
        padTwoDigits(date.getMonth() + 1),
        padTwoDigits(date.getDate()),
      ].join(dateDivider) +
      " " +
      [
        padTwoDigits(date.getHours()),
        padTwoDigits(date.getMinutes()),
        padTwoDigits(date.getSeconds()),
      ].join(":")
  );
}

export default function DateFormat({date_in_epoch_ms}: DateProps) {
  return (
    <>
      {dateInYyyyMmDdHhMmSs(new Date(date_in_epoch_ms),"-")}
    </>
  );
}
