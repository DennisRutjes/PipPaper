* conversion of tradovate file to generic PipTrader files so these can also be manually crafted
* tradovate import correct EntryDate,EntryPrice,ExitDate,ExitPrice based on earliest Data
* incorporate cost field into trade, based on fillId date -> costs have to be divided between multiple trades (buy,sell fillid can be repeated over trades)
* derive net P&L
* derive Net ROI
* Calculate Realized R