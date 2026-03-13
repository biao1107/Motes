"use strict";
const common_vendor = require("../../common/vendor.js");
const common_api = require("../../common/api.js");
const _sfc_main = {
  data() {
    return {
      searchKeyword: "",
      activeType: "",
      activeDifficulty: "",
      page: 1,
      size: 10,
      courseList: [],
      recommendCourses: [],
      loading: false,
      hasMore: true,
      total: 0
    };
  },
  onLoad() {
    this.loadRecommendCourses();
    this.loadCourseList();
  },
  methods: {
    // 获取难度class名称（将中文映射为英文）
    getDifficultyClass(difficulty) {
      const difficultyMap = {
        "入门": "diff-beginner",
        "初级": "diff-elementary",
        "中级": "diff-intermediate",
        "高级": "diff-advanced"
      };
      return difficultyMap[difficulty] || "diff-beginner";
    },
    // 加载推荐课程
    async loadRecommendCourses() {
      try {
        const res = await common_api.apiGetRecommendCourses(6);
        this.recommendCourses = res || [];
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/course/index.vue:224", "加载推荐课程失败:", error);
      }
    },
    // 加载课程列表
    async loadCourseList(reset = false) {
      if (this.loading)
        return;
      this.loading = true;
      if (reset) {
        this.page = 1;
        this.courseList = [];
        this.hasMore = true;
      }
      try {
        const res = await common_api.apiGetCourseList(this.page, this.size, this.activeType, this.activeDifficulty);
        const newList = res.records || res || [];
        if (reset) {
          this.courseList = newList;
        } else {
          this.courseList = [...this.courseList, ...newList];
        }
        this.total = res.total || 0;
        this.hasMore = this.courseList.length < this.total;
        this.page++;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/course/index.vue:255", "加载课程列表失败:", error);
        common_vendor.index.showToast({
          title: "加载失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
      }
    },
    // 搜索课程
    async onSearch() {
      if (!this.searchKeyword.trim()) {
        this.loadCourseList(true);
        return;
      }
      this.loading = true;
      this.courseList = [];
      try {
        const res = await common_api.apiSearchCourses(this.searchKeyword, 1, 20);
        this.courseList = res.records || res || [];
        this.total = res.total || 0;
        this.hasMore = false;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/course/index.vue:282", "搜索课程失败:", error);
        common_vendor.index.showToast({
          title: "搜索失败",
          icon: "none"
        });
      } finally {
        this.loading = false;
      }
    },
    // 按类型筛选
    filterByType(type) {
      this.activeType = type;
      this.loadCourseList(true);
    },
    // 按难度筛选
    filterByDifficulty(difficulty) {
      this.activeDifficulty = difficulty;
      this.loadCourseList(true);
    },
    // 加载更多
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.loadCourseList();
      }
    },
    // 跳转到课程详情
    goToCourseDetail(courseId) {
      common_vendor.index.navigateTo({
        url: `/pages/course/detail?id=${courseId}`
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.onSearch && $options.onSearch(...args)),
    b: $data.searchKeyword,
    c: common_vendor.o(($event) => $data.searchKeyword = $event.detail.value),
    d: common_vendor.o((...args) => $options.onSearch && $options.onSearch(...args)),
    e: $data.activeType === "" ? 1 : "",
    f: common_vendor.o(($event) => $options.filterByType("")),
    g: $data.activeType === "有氧" ? 1 : "",
    h: common_vendor.o(($event) => $options.filterByType("有氧")),
    i: $data.activeType === "力量" ? 1 : "",
    j: common_vendor.o(($event) => $options.filterByType("力量")),
    k: $data.activeType === "柔韧" ? 1 : "",
    l: common_vendor.o(($event) => $options.filterByType("柔韧")),
    m: $data.activeDifficulty === "" ? 1 : "",
    n: common_vendor.o(($event) => $options.filterByDifficulty("")),
    o: $data.activeDifficulty === "入门" ? 1 : "",
    p: common_vendor.o(($event) => $options.filterByDifficulty("入门")),
    q: $data.activeDifficulty === "初级" ? 1 : "",
    r: common_vendor.o(($event) => $options.filterByDifficulty("初级")),
    s: $data.activeDifficulty === "中级" ? 1 : "",
    t: common_vendor.o(($event) => $options.filterByDifficulty("中级")),
    v: $data.recommendCourses.length > 0 && !$data.searchKeyword
  }, $data.recommendCourses.length > 0 && !$data.searchKeyword ? {
    w: common_vendor.f($data.recommendCourses, (course, k0, i0) => {
      return common_vendor.e({
        a: course.coverImage
      }, course.coverImage ? {
        b: course.coverImage
      } : {}, {
        c: common_vendor.t(course.courseName),
        d: common_vendor.t(course.description),
        e: common_vendor.t(course.duration),
        f: common_vendor.t(course.calories),
        g: course.id,
        h: common_vendor.o(($event) => $options.goToCourseDetail(course.id), course.id)
      });
    })
  } : {}, {
    x: common_vendor.t($data.searchKeyword ? "搜索结果" : "全部课程"),
    y: common_vendor.t($data.courseList.length),
    z: common_vendor.f($data.courseList, (course, k0, i0) => {
      return common_vendor.e({
        a: course.coverImage
      }, course.coverImage ? {
        b: course.coverImage
      } : {}, {
        c: common_vendor.t(course.courseName),
        d: common_vendor.t(course.courseType),
        e: common_vendor.t(course.difficulty),
        f: common_vendor.n($options.getDifficultyClass(course.difficulty)),
        g: common_vendor.t(course.description),
        h: common_vendor.t(course.duration),
        i: common_vendor.t(course.calories || 0),
        j: course.videoUrl
      }, course.videoUrl ? {} : {}, {
        k: course.id,
        l: common_vendor.o(($event) => $options.goToCourseDetail(course.id), course.id)
      });
    }),
    A: $data.hasMore
  }, $data.hasMore ? {
    B: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  } : {}, {
    C: $data.courseList.length === 0 && !$data.loading
  }, $data.courseList.length === 0 && !$data.loading ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-b94ccfa4"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/course/index.js.map
