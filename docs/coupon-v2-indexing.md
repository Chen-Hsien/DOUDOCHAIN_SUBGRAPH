# 折抵券 V2 索引契約

日期：2026-11-09。本機已新增事件與 schema，沒有部署、重索引或修改地址與 start block。

## Purchase 事件

Bundle 及固定機率發出相同 `DatabasePointsPurchaseMintedV2` ABI。事件保留原 DB purchase 欄位順序，再追加 `couponDiscount`、`pricingSnapshotHash`、`pricingVersion`。

兩個 handler 共用 `src/coupon-purchase.ts`，建立獨立的 `DatabasePointsPurchaseMintV2`。事件 ID 為交易 hash 與 log index。entity 同時保存 `contractAddress`、`sourceMode`、原 G、B、C、`debitNowPoints=G-C` 與 `netPointsConsumed=G-B-C`。相同系列數字不會跨合約或模式混用。

V2 handler 驗證 version=2、snapshot 非零、C 為正整數 Points 及 net 至少一個完整 Points。錯誤事件不會被當成無券原價事件。舊 `DatabasePointsPurchaseMint` 與 handler 保留原形狀，V2 合約不重發舊 DB purchase 事件。

## 固定機率訂單

`OrderRequestedV2` 保留舊 OrderRequested 的完整欄位順序，再追加 C、snapshot hash、version。新舊 handler 共用系列、價格、回饋、額度、會員及 eligibility 檢查。V1 驗 `N=G-B`，V2 驗 `N=G-B-C`。

`FixedProbabilityOrder` 新增 `couponDiscount`、`debitNowPoints`、`pricingVersion` 與可空的 `pricingSnapshotHash`。歷史 V1 訂單使用 C=0、debit=G、version=1。既有 Order.netPoints、免單退款與會員消費使用 N，保留舊的 order、draw 與 NFT ID。

## ABI 與歷史證據

`abis/FixedProbabilityLotteryBuyback.json` 維持歷史檔案，部署紀錄中的 ABI hash 不變。新 `abis/FixedProbabilityLotteryCouponV2.json` 是相容的完整超集。manifest 繼續使用 `FixedProbabilityLotteryBuyback` alias，ABI 檔案指向 V2 超集，因此生成型別的 import 路徑不變。

`tests/coupon-abi-compatibility.test.mjs` 逐項確認歷史 ABI 未遭修改、兩模式的 V2 purchase 形狀一致，以及兩個固定機率 manifest 使用相同新事件。部署 evidence、endpoint、地址及 start block 均未更動。

## 本機驗證

`npm run codegen` 生成型別。`node scripts/run-environment.mjs build test` 與 `node scripts/run-environment.mjs build prod` 編譯兩個環境的 Graph manifest。

`npx graph test coupon --version 0.6.0` 驗證事件到 entity 的金額、完整版本欄位、跨模式識別、免單退款及錯誤公式拒絕。`fixed-probability` 與 `bundle` Matchstick suites 驗證歷史行為。

`node --test tests/coupon-abi-compatibility.test.mjs tests/native-buyback-deployment.test.mjs` 驗證 ABI 超集與原部署證據。

本機結果：test 與 prod Graph build 均通過。Matchstick coupon 5、fixed-probability 25、bundle 6 個測試通過。包含 ABI 超集的新舊部署安全檢查共 44 個 Node tests 通過。生成型別位於既有忽略的 generated 目錄，Matchstick 產物沒有加入變更。
