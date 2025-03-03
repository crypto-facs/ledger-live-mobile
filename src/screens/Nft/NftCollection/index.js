// @flow

import React, { useState, useRef, useCallback, useMemo } from "react";

import {
  View,
  StyleSheet,
  Platform,
  SectionList,
  FlatList,
  SafeAreaView,
} from "react-native";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useNavigation, useTheme } from "@react-navigation/native";
import { groupAccountOperationsByDay } from "@ledgerhq/live-common/lib/account";
import Animated, { Value, event } from "react-native-reanimated";

import type { SectionBase } from "react-native/Libraries/Lists/SectionList";
import type { CollectionWithNFT, NFT } from "@ledgerhq/live-common/lib/nft";
import type { Operation } from "@ledgerhq/live-common/lib/types";

import NoMoreOperationFooter from "../../../components/NoMoreOperationFooter";
import { accountScreenSelector } from "../../../reducers/accounts";
import LoadingFooter from "../../../components/LoadingFooter";
import SectionHeader from "../../../components/SectionHeader";
import OperationRow from "../../../components/OperationRow";
import { NavigatorName, ScreenName } from "../../../const";
import NftCard from "../../../components/Nft/NftCard";
import Button from "../../../components/Button";
import SendIcon from "../../../icons/Send";

const MAX_NFT_FIRST_RENDER = 12;
const NFTS_TO_ADD_ON_LIST_END_REACHED = 6;

type Props = {
  navigation: any,
  route: RouteParams,
};

type RouteParams = {
  params: {
    accountId: string,
    collection: CollectionWithNFT,
  },
};

const NftList = Animated.createAnimatedComponent(FlatList);
const OperationsList = Animated.createAnimatedComponent(SectionList);

const renderOperationSectionHeader = ({ section }: any) => (
  <SectionHeader section={section} />
);

const NftCollection = ({ route }: Props) => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { params } = route;
  const { account, parentAccount } = useSelector(accountScreenSelector(route));
  const scrollY = useRef(new Value(0)).current;
  const onScroll = () =>
    event(
      [
        {
          nativeEvent: {
            contentOffset: { y: scrollY },
          },
        },
      ],
      { useNativeDriver: true },
    );

  // nfts' list related -----
  const [nftCount, setNftCount] = useState(MAX_NFT_FIRST_RENDER);
  const nfts = useMemo(() => params.collection.nfts.slice(0, nftCount), [
    nftCount,
    params.collection,
  ]);
  const sendToken = () => {
    navigation.navigate(NavigatorName.SendFunds, {
      screen: ScreenName.SendNft,
      params: {
        account,
        collection: params.collection,
      },
    });
  };

  const renderNftItem = useCallback(
    ({ item, index }) => (
      <NftCard
        key={item.id}
        nft={item}
        collection={params.collection}
        style={{
          maxWidth: "50%",
          paddingLeft: index % 2 !== 0 ? 8 : 0,
          paddingRight: index % 2 === 0 ? 8 : 0,
        }}
      />
    ),
    [params.collection],
  );

  const renderNftListFooter = useCallback(
    () => (params.collection.nfts.length > nftCount ? <LoadingFooter /> : null),
    [params.collection.nfts.length, nftCount],
  );

  const onNftsEndReached = useCallback(() => {
    setNftCount(nftCount + NFTS_TO_ADD_ON_LIST_END_REACHED);
  }, [nftCount]);

  // operations' list related -----
  const [opCount, setOpCount] = useState(100);
  const { sections, completed } = groupAccountOperationsByDay(account, {
    count: opCount,
    filterOperation: op =>
      op?.nftOperations?.find(
        op => op?.contract === params?.collection?.contract,
      ),
  });

  const renderOperationItem = useCallback(
    ({
      item,
      index,
      section,
    }: {
      item: Operation,
      index: number,
      section: SectionBase<any>,
    }) => {
      if (!account) return null;

      return (
        <OperationRow
          operation={item}
          account={account}
          parentAccount={parentAccount}
          isLast={section.data.length - 1 === index}
        />
      );
    },
    [account, parentAccount],
  );

  const onOperationsEndReached = useCallback(() => {
    setOpCount(opCount + 50);
  }, [setOpCount, opCount]);

  const data = [
    <View style={styles.buttonContainer}>
      <Button
        type="primary"
        IconLeft={SendIcon}
        containerStyle={styles.button}
        title={t("account.send")}
        onPress={sendToken}
      />
    </View>,
    <View style={styles.nftList}>
      <NftList
        data={nfts}
        numColumns={2}
        keyExtractor={(nft: NFT) => nft.id}
        renderItem={renderNftItem}
        onEndReached={onNftsEndReached}
        onScroll={onScroll}
        ListFooterComponent={renderNftListFooter}
      />
    </View>,
    <View style={styles.contentContainer}>
      <OperationsList
        sections={sections}
        style={[styles.sectionList, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        keyExtractor={(op: Operation) => op.id}
        renderItem={renderOperationItem}
        renderSectionHeader={renderOperationSectionHeader}
        onEndReached={onOperationsEndReached}
        onScroll={onScroll}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          !completed ? <LoadingFooter /> : <NoMoreOperationFooter />
        }
      />
    </View>,
  ];

  return (
    <SafeAreaView
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <FlatList
        data={data}
        renderItem={({ item }) => item}
        keyExtractor={(item, index) => String(index)}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  buttonContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
    zIndex: 2,
    ...Platform.select({
      android: {
        elevation: 3,
      },
      ios: {
        shadowOpacity: 0.2,
        shadowRadius: 14,
        shadowOffset: {
          height: 5,
          width: 5,
        },
      },
    }),
  },
  button: {
    borderRadius: 100,
  },
  nftList: {
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  sectionList: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 64,
    flexGrow: 1,
  },
});

export default NftCollection;
