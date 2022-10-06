import React, { ReactElement, useMemo } from 'react';
import { GetStaticPaths, GetStaticPathsResult, GetStaticProps } from 'next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import updateLocale from 'dayjs/plugin/updateLocale';
import timeZone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import blocks from '../blocks/server';
import { Blocks } from '../components/base/Blocks/Blocks';
import { Head } from '../components/base/Head/Head';
import { Layout } from '../components/base/Layout/Layout';
import { Navbar } from '../components/organisms/Navbar/Navbar';
import { CALENDAR_FORMATS } from '../constants';
import providers from '../providers';
import config from '../../sklinet.config.json';
import { Logger } from '@symbio/headless/services';
import { AppStore, getBlocksProps, MyPageProps } from '@symbio/headless';
import { PageProps } from '../types/page';
import { WebSettingsProps } from '../types/webSettings';
import { MetaItems } from '../types/metaItem';
import { MenuItem } from '../types/menu';
import NextNprogress from 'nextjs-progressbar';
import { PreviewToolbar } from '../components/primitives/PreviewToolbar/PreviewToolbar';

const GridHelper = dynamic<unknown>(() =>
    import('../components/primitives/GridHelper/GridHelper').then((mod) => mod.GridHelper),
);

const Page = (props: MyPageProps<PageProps, WebSettingsProps>): ReactElement => {
    const { hostname, site, page, webSetting, blocksPropsMap, preview, redirect } = props;
    const { gtm, tz } = config;
    const items = Object.values(blocksPropsMap as unknown as MetaItems);
    const item = Array.isArray(items) && items.length > 0 ? items[0].item : undefined;
    const menuItems = webSetting?.data?.attributes?.mainMenu?.data?.attributes?.items || [];
    const router = useRouter();
    const locale = router.locale || router.defaultLocale;
    const currentUrl =
        '/' + (router.locale === router.defaultLocale ? '' : router.locale) + router.asPath !== '/'
            ? router.asPath
            : '';
    const app = useMemo(
        () => ({
            currentUrl,
            hostname,
            page,
            site,
            item,
            webSetting,
            redirect,
        }),
        [page],
    );
    if (router.isFallback) {
        return <div>Loading...</div>;
    }

    dayjs.extend(updateLocale);
    dayjs.extend(timeZone);
    dayjs.extend(localizedFormat);
    if (locale) {
        dayjs.updateLocale(locale, { calendar: CALENDAR_FORMATS[locale] });
        dayjs.locale(locale);
    }
    dayjs.tz.setDefault(tz);

    AppStore.getInstance<PageProps, WebSettingsProps>(app);

    return (
        <>
            <Head site={webSetting} page={page} item={item} />
            <NextNprogress color="#00B5EC" options={{ showSpinner: false }} />
            <Layout>
                <Navbar menuItems={menuItems as readonly MenuItem[]} />
                {page && <Blocks blocksData={page.blocks} initialProps={blocksPropsMap} app={app} />}
            </Layout>

            {preview && <PreviewToolbar />}
            {preview && <GridHelper />}

            {gtm.code && (
                <noscript
                    dangerouslySetInnerHTML={{
                        __html: `<!-- Google Tag Manager (noscript) -->
                        <iframe src="https://www.googletagmanager.com/ns.html?id=${gtm.code}" height="0" width="0" style="display:none;visibility:hidden"></iframe>
                        <!-- End Google Tag Manager (noscript) -->`,
                    }}
                />
            )}
        </>
    );
};

export const getStaticPaths: GetStaticPaths = async ({ locales }) => {
    const { ssg } = config;
    if (process.env.NODE_ENV !== 'development' && ssg.staticGeneration && locales) {
        const paths: GetStaticPathsResult['paths'] = [];
        const provider = providers.page;

        // loop over all locales
        for (const locale of locales) {
            const localePaths = await provider.getStaticPaths(locale, blocks);
            paths.push(...localePaths);
        }

        return {
            paths,
            fallback: false,
        };
    } else {
        return {
            paths: [],
            fallback: 'blocking',
        };
    }
};

export const getStaticProps: GetStaticProps = async (context) => {
    const { tz } = config;
    const p = context.params;
    Logger.info('GET ' + '/' + (p && Array.isArray(p.slug) ? p.slug : []).join('/'));
    const locale = context.locale || context.defaultLocale;
    dayjs.extend(updateLocale);
    dayjs.extend(timeZone);
    dayjs.extend(localizedFormat);
    if (locale) {
        dayjs.updateLocale(locale, { calendar: CALENDAR_FORMATS[locale] });
        dayjs.locale(locale);
    }
    dayjs.tz.setDefault(tz);

    return await getBlocksProps(context, providers, blocks, config.ssg);
};

export default Page;
