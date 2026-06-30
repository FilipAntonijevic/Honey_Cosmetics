using HoneyCosmetics.Application;

namespace HoneyCosmetics.Tests;

public class ProductCatalogSortOrderTests
{
    [Theory]
    [InlineData("Clear BIAB B01 15ml", "BIAB B02 15ml", -1)]
    [InlineData("BIAB B03 15ml", "BIAB B04 15ml", -1)]
    [InlineData("BIAB B05 15ml", "Clear BIAB B01 15ml", 1)]
    [InlineData("Top Coat 15ml", "Top Coat Brilliant 15ml", -1)]
    [InlineData("Top Coat Brilliant 15ml", "Colored Top Coat T01 15ml", 0)]
    public void ProductNaturalNameComparer_respects_hardcoded_order(string left, string right, int expectedSign)
    {
        var result = ProductNaturalNameComparer.Instance.Compare(left, right);
        Assert.Equal(Math.Sign(expectedSign), Math.Sign(result));
        if (expectedSign == 0)
            Assert.Equal(0, result);
    }
}
